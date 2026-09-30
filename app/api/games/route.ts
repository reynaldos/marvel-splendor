import { NextResponse } from "next/server";

import { CreateGameSchema } from "@/lib/api-schemas";
import { auth0 } from "@/lib/auth0";
import { isTurnPrimary } from "@/lib/coins";
import { prisma } from "@/lib/db";
import { createGame } from "@/lib/engine/setup";
import { DEFAULT_SETTINGS, type GameSettings, type GameState } from "@/lib/engine/types";
import { generateJoinCode, generateSeed, isUniqueViolation, runServerTurnLoop } from "@/lib/game-server";
import { redactState } from "@/lib/game-view";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { Prisma } from "@/lib/generated/prisma/client";
import { recordGameStats } from "@/lib/record-stats";

/**
 * POST /api/games — creates a vs-bot game (ARCHITECTURE.md §8 Phase 1 scope;
 * multiplayer LOBBY-status creation is Phase 2). The human is always seat 0;
 * every other seat is a bot. vs-bot games skip the LOBBY status entirely and
 * start ACTIVE immediately (§5: "vs-Bot games skip Pusher entirely").
 */
export async function POST(request: Request) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const user = await getOrCreateUser(session.user);

  const body = await request.json().catch(() => null);
  const parsed = CreateGameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid game settings.", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { playerCount, botDifficulty, targetPoints, turnTimeSeconds, gameTimeMinutes } = parsed.data;

  const settings: GameSettings = {
    ...DEFAULT_SETTINGS,
    targetPoints: targetPoints ?? DEFAULT_SETTINGS.targetPoints,
    turnTimeSeconds: turnTimeSeconds ?? DEFAULT_SETTINGS.turnTimeSeconds,
    gameTimeMinutes: gameTimeMinutes ?? DEFAULT_SETTINGS.gameTimeMinutes,
    startedAt: Date.now(),
    botDifficulty: botDifficulty ?? "normal",
  };

  const seed = generateSeed();
  const initialState = createGame(playerCount, seed, settings);

  // Seat 0 is always the human; every other seat is a bot. If the randomly
  // chosen starting seat is a bot, run the bot loop now so the human's very
  // first fetch already shows a board they can act on, rather than an empty
  // poll waiting for a bot turn that already could have happened.
  const isBotSeat = (seat: number) => seat !== 0;
  const { state: finalState, applied } = runServerTurnLoop(initialState, isBotSeat);

  const gameId = await createGameRecord({
    seed,
    settings,
    playerCount,
    userId: user.id,
    state: finalState,
    applied,
  });

  if (finalState.status === "finished") {
    await recordFinishedGameStats(finalState, user.id, applied);
  }

  return NextResponse.json(
    {
      id: gameId,
      view: redactState(finalState, 0),
    },
    { status: 201 },
  );
}

async function createGameRecord(args: {
  seed: string;
  settings: GameSettings;
  playerCount: number;
  userId: string;
  state: GameState;
  applied: ReturnType<typeof runServerTurnLoop>["applied"];
}): Promise<string> {
  const { seed, settings, playerCount, userId, state, applied } = args;

  // A handful of retries covers the astronomically unlikely case of a
  // joinCode collision (see lib/get-or-create-user.ts's username retry for
  // the same defensive pattern).
  for (let attempt = 0; attempt < 5; attempt++) {
    const joinCode = generateJoinCode();
    try {
      const game = await prisma.$transaction(async (tx) => {
        const created = await tx.game.create({
          data: {
            joinCode,
            status: state.status === "finished" ? "FINISHED" : "ACTIVE",
            mode: "VS_BOT",
            seed,
            settings: settings as unknown as Prisma.InputJsonValue,
            state: state as unknown as Prisma.InputJsonValue,
            version: 0,
            winnerSeat: state.winnerSeat,
          },
        });

        await tx.gamePlayer.createMany({
          data: Array.from({ length: playerCount }, (_, seat) => ({
            gameId: created.id,
            seat,
            userId: seat === 0 ? userId : null,
            isBot: seat !== 0,
          })),
        });

        if (applied.length > 0) {
          await tx.move.createMany({
            data: applied.map((m) => ({
              gameId: created.id,
              ordinal: m.ordinal,
              seat: m.seat,
              payload: m.move as unknown as Prisma.InputJsonValue,
            })),
          });
        }

        return created;
      });
      return game.id;
    } catch (error) {
      if (isUniqueViolation(error, "joinCode")) continue;
      throw error;
    }
  }

  throw new Error("Failed to allocate a unique join code after several attempts");
}

/**
 * Extremely unlikely at creation time (the compound win condition needs
 * targetPoints, which nobody can reach with zero recruits), but handled for
 * completeness: if the pre-human bot loop somehow finishes the game before
 * the human ever gets a turn, record their stats just like the moves route
 * does for a normal finish.
 */
async function recordFinishedGameStats(
  finalState: GameState,
  humanUserId: string,
  applied: ReturnType<typeof runServerTurnLoop>["applied"],
) {
  const humanSeat = 0;
  const player = finalState.players[humanSeat];
  const isWinner =
    finalState.winnerSeat === humanSeat || (finalState.sharedWinners?.includes(humanSeat) ?? false);
  const turns = applied.filter((m) => m.seat === humanSeat && isTurnPrimary(m.move.type)).length;

  await recordGameStats({
    mode: "VS_BOT",
    players: [
      {
        userId: humanUserId,
        isWinner,
        points: player.points,
        turns,
        wonAvengersTile: finalState.avengersHolder === humanSeat,
        locationsClaimed: player.locations.length,
      },
    ],
  });
}
