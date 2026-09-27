import { NextResponse } from "next/server";

import { MoveSchema } from "@/lib/api-schemas";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { applyMove } from "@/lib/engine/apply";
import { validateMove } from "@/lib/engine/validate";
import type { GameState, Move } from "@/lib/engine/types";
import { isTableIdle, turnEndsInMs } from "@/lib/game-replay";
import { runServerTurnLoop, type AppliedMove } from "@/lib/game-server";
import { redactState } from "@/lib/game-view";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { notifyGame } from "@/lib/pusher";
import { Prisma } from "@/lib/generated/prisma/client";
import { recordGameStats } from "@/lib/record-stats";

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
  const move: Move = parsedMove.data;

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

  const state = game.state as unknown as GameState;
  const viewerSeat = seatRow.seat;
  // A timeout is the one move made on someone else's behalf: any player may
  // call it on whoever's turn has run out, so a closed tab can't freeze the game.
  const seat = move.type === "TIMEOUT_SKIP" ? state.currentSeat : viewerSeat;

  // Forfeiting doesn't wait for your turn.
  if (move.type !== "FORFEIT" && seat !== state.currentSeat) {
    return NextResponse.json({ error: "It is not your turn." }, { status: 403 });
  }

  if (move.type === "TIMEOUT_SKIP") {
    // ponytail: the turn is timed from the game row's last write, so resolving
    // a pending sub-move restarts the clock. Store a per-turn deadline in the
    // state if that slack ever matters.
    const left = turnEndsInMs(state, game.updatedAt);
    const required = viewerSeat === seat ? -TIMEOUT_GRACE_MS : OTHERS_CLAIM_DELAY_MS;
    if (left === null || -left < required) {
      return NextResponse.json({ error: "The turn time has not run out yet." }, { status: 400 });
    }
  }

  const validation = validateMove(state, seat, move);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  const humanOrdinal = state.moveCount;
  const afterHumanMove = applyMove(state, seat, move);

  const isBotSeat = (s: number) => game.players.find((p) => p.seat === s)?.isBot ?? false;
  const { state: finalState, applied: botApplied } = runServerTurnLoop(afterHumanMove, isBotSeat);

  const allApplied: AppliedMove[] = [{ seat, move, ordinal: humanOrdinal }, ...botApplied];

  // A timeout is the only move that can leave the table idle, so only then look.
  let abandoned = false;
  if (move.type === "TIMEOUT_SKIP" && finalState.status !== "finished") {
    const earlier = await prisma.move.findMany({
      where: { gameId: id },
      orderBy: { ordinal: "desc" },
      // Plenty to cover every seat's last two turns, sub-moves included.
      take: 40,
      select: { seat: true, payload: true },
    });
    abandoned = isTableIdle(
      game.players.filter((p) => !p.isBot).map((p) => p.seat),
      [
        ...allApplied.toReversed(),
        ...earlier.map((m) => ({ seat: m.seat, move: m.payload as unknown as Move })),
      ],
    );
  }

  const movedAt = new Date();
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
    await recordFinishedGameStats(id, game.mode, finalState, game.players, localUser.id);
  }

  // The board as it stood after each move — the submitted one, then every
  // auto-applied one — so the client can show them one at a time.
  let replay = state;
  const steps = allApplied.map(({ seat: s, move: m }) => {
    replay = applyMove(replay, s, m);
    return { seat: s, move: m, view: redactState(replay, viewerSeat) };
  });

  return NextResponse.json({
    // `view` already carries status/winnerSeat/sharedWinners.
    view: redactState(finalState, viewerSeat),
    status,
    steps,
    turnEndsInMs: abandoned ? null : turnEndsInMs(finalState, movedAt, movedAt.getTime()),
  });
}

async function persistMoves(
  gameId: string,
  expectedVersion: number,
  finalState: GameState,
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

async function recordFinishedGameStats(
  gameId: string,
  mode: "VS_BOT" | "MULTIPLAYER",
  finalState: GameState,
  players: Array<{ seat: number; userId: string | null; isBot: boolean }>,
  fallbackHumanUserId: string,
) {
  const humanPlayers = players.filter((p) => !p.isBot && p.userId);
  if (humanPlayers.length === 0) return;

  const primaryMoves = await prisma.move.findMany({
    where: { gameId },
    select: { seat: true, payload: true },
  });

  const outcomes = humanPlayers.map((p) => {
    const seat = p.seat;
    const player = finalState.players[seat];
    const isWinner =
      finalState.winnerSeat === seat || (finalState.sharedWinners?.includes(seat) ?? false);
    const turns = primaryMoves.filter(
      (m) => m.seat === seat && isTurnPrimary((m.payload as { type?: string })?.type),
    ).length;

    return {
      userId: p.userId ?? fallbackHumanUserId,
      isWinner,
      points: player.points,
      turns,
      wonAvengersTile: finalState.avengersHolder === seat,
      locationsClaimed: player.locations.length,
    };
  });

  await recordGameStats({ mode, players: outcomes });
}

function isTurnPrimary(type: string | undefined): boolean {
  return type === "TAKE_TOKENS" || type === "RESERVE" || type === "RECRUIT" || type === "TIMEOUT_SKIP";
}
