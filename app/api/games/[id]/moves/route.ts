import { NextResponse } from "next/server";

import { MoveSchema } from "@/lib/api-schemas";
import { auth0 } from "@/lib/auth0";
import { isTurnPrimary } from "@/lib/coins";
import { prisma } from "@/lib/db";
import { recordGameCoins } from "@/lib/record-coins";
import { keepsTurn } from "@/lib/duel/rules";
import type { DuelMove } from "@/lib/duel/types";
import { isAway, type GameSettings } from "@/lib/engine/types";
import { gameEndsInMs, isTableIdle, turnEndsInMs } from "@/lib/game-replay";
import { applyAny, isDuel, rankable, redactAny, validateAny, type AnyMove, type AnyState } from "@/lib/game-rules";
import { runServerTurnLoop, type AppliedMove } from "@/lib/game-server";
import { playbackMs } from "@/lib/playback";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { accountXpByUser } from "@/lib/load-xp";
import { rankPlayers } from "@/lib/game-record";
import { notifyGame } from "@/lib/pusher";
import { Prisma } from "@/lib/generated/prisma/client";
import { refreshLeaderboard } from "@/lib/load-leaderboard";
import { recordGameRating } from "@/lib/record-rating";
import { gameXpByUser, recordGameRewards } from "@/lib/record-rewards";
import { recordGameStats, type PlayerGameOutcome } from "@/lib/record-stats";
import { saveCollectedCards } from "@/lib/save-collection";

/** Tolerance for the client's countdown finishing a hair before the server's. */
const TIMEOUT_GRACE_MS = 1000;
/** Extra wait before another player may time someone out, so their own device goes first. */
const OTHERS_CLAIM_DELAY_MS = 2000;

/**
 * POST /api/games/[id]/moves — submit the current seat's move, then run the
 * server-side bot loop (ARCHITECTURE.md §5: "the move POST response contains
 * the bot's reply move(s) and new view"). `botMoves` in the response
 * carries every move the server auto-applied AFTER the submitter's own move
 * — bot choices, and any zero-legal-moves TIMEOUT_SKIPs for any seat. `steps`
 * in the response is the submitted move followed by those, each with the
 * board after it, so the client can play them back one at a time.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const localUser = await getOrCreateUser(session.user);

  const body = await request.json().catch(() => null);
  const parsedMove = MoveSchema.safeParse(body);
  if (!parsedMove.success) {
    return NextResponse.json(
      { error: "Invalid move shape.", issues: parsedMove.error.issues },
      { status: 400 },
    );
  }
  const sent: AnyMove = parsedMove.data;

  const game = await prisma.game.findUnique({
    where: { id },
    include: { players: true },
  });
  if (!game) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }

  const seatRow = game.players.find((p) => p.userId === localUser.id);
  if (!seatRow) {
    return NextResponse.json({ error: "You are not a participant in this game." }, { status: 403 });
  }

  if (game.status !== "ACTIVE") {
    return NextResponse.json({ error: "This game is not active." }, { status: 400 });
  }

  const stored = game.state as unknown as AnyState;
  // The game clock is checked whenever anyone moves. Once it has run out, that
  // is recorded first, and the round in progress becomes the last.
  const clockLeft = gameEndsInMs(stored.settings, game.createdAt);
  const clockRanOut = clockLeft !== null && clockLeft <= 0 && !stored.clockExpired && sent.type !== "FORFEIT";
  const clockMove: AppliedMove[] = clockRanOut
    ? [{ seat: stored.currentSeat, move: { type: "END_BY_CLOCK" }, ordinal: stored.moveCount }]
    : [];
  const state: AnyState = clockRanOut ? applyAny(stored, stored.currentSeat, { type: "END_BY_CLOCK" }) : stored;
  const viewerSeat = seatRow.seat;
  // A timeout is the one move made on someone else's behalf: any player may
  // call it on whoever's turn has run out, so a closed tab can't freeze the game.
  const seat = sent.type === "TIMEOUT_SKIP" ? state.currentSeat : viewerSeat;
  // Only the player themselves can say they were there.
  const move: AnyMove = sent.type === "TIMEOUT_SKIP" && seat !== viewerSeat ? { type: "TIMEOUT_SKIP" } : sent;

  // A player removed for being away has no more say in the game, not even to forfeit it.
  if (isAway(state.players[viewerSeat])) {
    return NextResponse.json({ error: "You were removed from this game." }, { status: 403 });
  }

  // Forfeiting doesn't wait for your turn.
  if (move.type !== "FORFEIT" && seat !== state.currentSeat) {
    return NextResponse.json({ error: "It is not your turn." }, { status: 403 });
  }

  if (move.type === "TIMEOUT_SKIP") {
    const left = turnEndsInMs(state, game.updatedAt);
    const required = viewerSeat === seat ? -TIMEOUT_GRACE_MS : OTHERS_CLAIM_DELAY_MS;
    if (left === null || -left < required) {
      return NextResponse.json({ error: "The turn time has not run out yet." }, { status: 400 });
    }
  }

  // The clock ending the game outright leaves no turn to take.
  const over = state.status === "finished";
  if (!over) {
    const validation = validateAny(state, seat, move);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.reason }, { status: 400 });
    }
  }

  const humanOrdinal = state.moveCount;
  const afterHumanMove = over ? state : applyAny(state, seat, move);

  const isBotSeat = (s: number) => game.players.find((p) => p.seat === s)?.isBot ?? false;
  const { state: finalState, applied: botApplied } = runServerTurnLoop(afterHumanMove, isBotSeat);

  const allApplied: AppliedMove[] = [
    ...clockMove,
    ...(over ? [] : [{ seat, move, ordinal: humanOrdinal }]),
    ...botApplied,
  ];

  const abandoned =
    finalState.status !== "finished" &&
    isTableIdle(
      game.players.filter((p) => !p.isBot).map((p) => p.seat),
      finalState,
    );

  // The board as it stood after each move — the submitted one, then every
  // auto-applied one — so the client can show them one at a time.
  let replay = stored;
  let playback = 0;
  const steps = allApplied.map(({ seat: s, move: m }) => {
    const next = applyAny(replay, s, m);
    playback += playbackMs(replay, s, m, next, isBotSeat(s));
    replay = next;
    return { seat: s, move: m, view: redactAny(next, viewerSeat) };
  });

  const now = new Date();
  // A move that leaves a choice to make, or a Duel free move, hasn't ended the turn, so its clock keeps running.
  const sameTurn = finalState.status === "active" && (finalState.pending !== null || (isDuel(state) && keepsTurn(state, move as DuelMove)));
  // The clock starts once every device has shown the moves, not the instant they were saved.
  const movedAt = new Date((sameTurn ? game.updatedAt : now).getTime() + playback);
  const status = finalState.status === "finished" ? "FINISHED" : abandoned ? "ABANDONED" : "ACTIVE";
  const persisted = await persistMoves(id, game.version, finalState, allApplied, movedAt, status);
  if (!persisted) {
    return NextResponse.json(
      { error: "Game was updated concurrently — please refresh and retry." },
      { status: 409 },
    );
  }

  // vs-bot games have one device, which gets everything in this response.
  if (game.mode === "MULTIPLAYER") await notifyGame(id);

  if (finalState.status === "finished") {
    const outcomes = await buildHumanOutcomes(id, finalState, game.players, localUser.id);
    const stats = await recordGameStats({ mode: game.mode, players: outcomes });
    const rating = await recordFinishedGameRating(game.mode, finalState, game.players, localUser.id);
    const coins = await recordFinishedGameCoins(id, finalState.settings, game.players, outcomes);
    const xpBefore = await accountXpByUser(outcomes.map((o) => o.userId));
    const gameXp = gameXpByUser(finalState, game.players);
    // The move itself is saved by now; a collection that fails to save can be put right by the backfill.
    const cards = await saveCollectedCards(id, game.players).catch((error) => {
      console.error("collection not saved", id, error);
      return [];
    });
    await recordGameRewards(id, game.players, { stats, rating, coins, xpBefore, gameXp, cards });
    refreshLeaderboard();
    // The other players fetched the final move before the rewards were there.
    if (game.mode === "MULTIPLAYER") await notifyGame(id);
  }

  return NextResponse.json({
    // `view` already carries status/winnerSeat/sharedWinners.
    view: redactAny(finalState, viewerSeat),
    status,
    steps,
    turnEndsInMs: abandoned ? null : turnEndsInMs(finalState, movedAt, now.getTime()),
    gameEndsInMs: gameEndsInMs(finalState.settings, game.createdAt),
  });
}

async function persistMoves(
  gameId: string,
  expectedVersion: number,
  finalState: AnyState,
  applied: AppliedMove[],
  movedAt: Date,
  status: "ACTIVE" | "FINISHED" | "ABANDONED",
): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      const result = await tx.game.updateMany({
        where: { id: gameId, version: expectedVersion },
        data: {
          state: finalState as unknown as Prisma.InputJsonValue,
          version: expectedVersion + 1,
          // The turn clock runs from this exact instant (see turnEndsInMs).
          updatedAt: movedAt,
          status,
          winnerSeat: finalState.winnerSeat,
        },
      });
      if (result.count === 0) {
        throw new StaleVersionError();
      }

      await tx.move.createMany({
        data: applied.map((m) => ({
          gameId,
          ordinal: m.ordinal,
          seat: m.seat,
          payload: m.move as unknown as Prisma.InputJsonValue,
        })),
      });
    });
    return true;
  } catch (error) {
    if (error instanceof StaleVersionError) return false;
    throw error;
  }
}

class StaleVersionError extends Error {}

async function buildHumanOutcomes(
  gameId: string,
  finalState: AnyState,
  players: Array<{ seat: number; userId: string | null; isBot: boolean }>,
  fallbackHumanUserId: string,
): Promise<Array<PlayerGameOutcome & { seat: number }>> {
  const humanPlayers = players.filter((p) => !p.isBot && p.userId);
  if (humanPlayers.length === 0) return [];

  const primaryMoves = await prisma.move.findMany({
    where: { gameId },
    select: { seat: true, payload: true },
  });

  const record = rankable(finalState);
  return humanPlayers.map((p) => {
    const seat = p.seat;
    const player = record.players[seat];
    const isWinner = record.winnerSeat === seat || (record.sharedWinners?.includes(seat) ?? false);
    const turns = primaryMoves.filter(
      (m) => m.seat === seat && isTurnPrimary((m.payload as { type?: string })?.type),
    ).length;

    return {
      seat,
      userId: p.userId ?? fallbackHumanUserId,
      isWinner,
      points: player.points,
      turns,
      wonAvengersTile: !isDuel(finalState) && finalState.avengersHolder === seat,
      locationsClaimed: isDuel(finalState) ? 0 : finalState.players[seat].locations.length,
    };
  });
}

/** Rank only moves for a multiplayer game with 2+ humans — a bot-filled seat is never a rated opponent. */
async function recordFinishedGameRating(
  mode: "VS_BOT" | "MULTIPLAYER",
  finalState: AnyState,
  players: Array<{ seat: number; userId: string | null; isBot: boolean }>,
  fallbackHumanUserId: string,
) {
  if (mode !== "MULTIPLAYER") return [];

  const humanPlayers = players.filter((p) => !p.isBot && p.userId);
  if (humanPlayers.length < 2) return [];

  const ranked = rankPlayers(rankable(finalState), []);
  const placements = humanPlayers.map((p) => ({
    userId: p.userId ?? fallbackHumanUserId,
    place: ranked.find((r) => r.seat === p.seat)!.place,
  }));

  return recordGameRating(placements);
}

async function recordFinishedGameCoins(
  gameId: string,
  settings: GameSettings,
  players: Array<{ seat: number; isBot: boolean }>,
  outcomes: Array<PlayerGameOutcome & { seat: number }>,
) {
  return recordGameCoins(
    gameId,
    settings,
    players,
    outcomes.map((o) => ({ userId: o.userId, seat: o.seat, isWinner: o.isWinner, turns: o.turns })),
  );
}
