import { NextResponse } from "next/server";

import { MoveSchema } from "@/lib/api-schemas";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { applyMove } from "@/lib/engine/apply";
import { validateMove } from "@/lib/engine/validate";
import type { GameState, Move } from "@/lib/engine/types";
import { runServerTurnLoop, type AppliedMove } from "@/lib/game-server";
import { redactState } from "@/lib/game-view";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { Prisma } from "@/lib/generated/prisma/client";
import { recordGameStats } from "@/lib/record-stats";

/**
 * POST /api/games/[id]/moves — submit the current seat's move, then run the
 * server-side bot loop (ARCHITECTURE.md §5: "the move POST response contains
 * the bot's reply move(s) and new view"). `botMoves` in the response
 * carries every move the server auto-applied AFTER the submitter's own move
 * — bot choices, and any zero-legal-moves TIMEOUT_SKIPs for any seat — so
 * the client can sequence/animate them one at a time.
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
  const seat = seatRow.seat;

  if (seat !== state.currentSeat) {
    return NextResponse.json({ error: "It is not your turn." }, { status: 403 });
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

  const persisted = await persistMoves(id, game.version, finalState, allApplied);
  if (!persisted) {
    return NextResponse.json(
      { error: "Game was updated concurrently — please refresh and retry." },
      { status: 409 },
    );
  }

  if (finalState.status === "finished") {
    await recordFinishedGameStats(id, finalState, game.players, localUser.id);
  }

  return NextResponse.json({
    // `view` already carries status/winnerSeat/sharedWinners.
    view: redactState(finalState, seat),
    botMoves: botApplied.map(({ seat: s, move: m }) => ({ seat: s, move: m })),
  });
}

async function persistMoves(
  gameId: string,
  expectedVersion: number,
  finalState: GameState,
  applied: AppliedMove[],
): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      const result = await tx.game.updateMany({
        where: { id: gameId, version: expectedVersion },
        data: {
          state: finalState as unknown as Prisma.InputJsonValue,
          version: expectedVersion + 1,
          status: finalState.status === "finished" ? "FINISHED" : "ACTIVE",
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

  await recordGameStats({ mode: "VS_BOT", players: outcomes });
}

function isTurnPrimary(type: string | undefined): boolean {
  return type === "TAKE_TOKENS" || type === "RESERVE" || type === "RECRUIT" || type === "TIMEOUT_SKIP";
}
