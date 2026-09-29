/**
 * Multiplayer lobby operations (ARCHITECTURE.md §5): creating a game in
 * LOBBY status and claiming a seat in one by join code. Players must be
 * signed in — every seat here is tied to a local `User`.
 */
import { prisma } from "@/lib/db";
import { DEFAULT_SETTINGS } from "@/lib/engine/types";
import { generateJoinCode, generateSeed, isUniqueViolation } from "@/lib/game-server";
import { Prisma } from "@/lib/generated/prisma/client";
import { notifyGame } from "@/lib/pusher";

export const MAX_SEATS = 4;

/** Join codes are typed by hand, so accept any case and stray whitespace. */
export function normalizeJoinCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(code) ? code : null;
}

const CHEAT_SUFFIX = /\+cheat$/i;

/**
 * A join code with "+cheat" appended (e.g. "ABC234+cheat") seats the player
 * normally but flags the game for cheat mode, same as opening it with
 * `?cheat=true`. Codes are plain alphanumeric, so "+" can't collide with one.
 */
export function extractCheatCode(raw: string): { code: string; cheat: boolean } {
  const trimmed = raw.trim();
  const cheat = CHEAT_SUFFIX.test(trimmed);
  return { code: trimmed.replace(CHEAT_SUFFIX, ""), cheat };
}

/** An address, with cheat mode carried along when it is on. */
export function withCheat(path: string, cheat: boolean): string {
  return cheat ? `${path}?cheat=true` : path;
}

/** The lowest seat number nobody holds yet, or null when the table is full. */
export function nextFreeSeat(takenSeats: number[]): number | null {
  for (let seat = 0; seat < MAX_SEATS; seat++) {
    if (!takenSeats.includes(seat)) return seat;
  }
  return null;
}

/** Creates a game in LOBBY status with `userId` hosting from seat 0. */
export async function createLobby(
  userId: string,
  rules: { targetPoints: number; turnTimeSeconds: number },
): Promise<string> {
  // A handful of retries covers the astronomically unlikely joinCode collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const game = await prisma.game.create({
        data: {
          joinCode: generateJoinCode(),
          status: "LOBBY",
          mode: "MULTIPLAYER",
          seed: generateSeed(),
          settings: { ...DEFAULT_SETTINGS, ...rules } as unknown as Prisma.InputJsonValue,
          // The real state is dealt when the host starts, once the player count is known.
          state: {},
          players: { create: { seat: 0, userId } },
        },
      });
      return game.id;
    } catch (error) {
      if (isUniqueViolation(error, "joinCode")) continue;
      throw error;
    }
  }
  throw new Error("Failed to allocate a unique join code after several attempts");
}

export type JoinResult =
  | { ok: true; gameId: string; status: "LOBBY" | "ACTIVE" | "FINISHED" | "ABANDONED" }
  | { ok: false; reason: string };

/**
 * Seats `userId` in the game with this join code. Safe to repeat: someone
 * already seated just gets their game back, which is also how a player
 * returns to a game in progress from the share link.
 */
export async function joinLobby(userId: string, rawCode: string): Promise<JoinResult> {
  const code = normalizeJoinCode(rawCode);
  if (!code) return { ok: false, reason: "That doesn't look like a join code. Codes are 6 letters and numbers." };

  // Two people can race for the same seat; the (gameId, seat) unique
  // constraint rejects the loser, who then retries for the next seat.
  for (let attempt = 0; attempt < MAX_SEATS; attempt++) {
    const game = await prisma.game.findUnique({ where: { joinCode: code }, include: { players: true } });
    if (!game) return { ok: false, reason: "No game has that code." };

    if (game.players.some((p) => p.userId === userId)) {
      return { ok: true, gameId: game.id, status: game.status };
    }
    if (game.status !== "LOBBY") return { ok: false, reason: "That game has already started." };

    const seat = nextFreeSeat(game.players.map((p) => p.seat));
    if (seat === null) return { ok: false, reason: "That game is full." };

    try {
      await prisma.gamePlayer.create({ data: { gameId: game.id, seat, userId } });
      await notifyGame(game.id);
      return { ok: true, gameId: game.id, status: game.status };
    } catch (error) {
      if (isUniqueViolation(error, "seat")) continue;
      throw error;
    }
  }
  return { ok: false, reason: "That game is full." };
}
