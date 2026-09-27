import { prisma } from "@/lib/db";

/**
 * The mutable subset of `UserStats` (everything except the `userId` PK/FK).
 * Deliberately re-declared here rather than imported from
 * `lib/generated/prisma` field-for-field, so this module has zero coupling
 * to Prisma's generated shape beyond what `lib/db.ts` already provides —
 * it's the same fields as the `UserStats` model in prisma/schema.prisma.
 */
export type UserStatsSnapshot = {
  gamesPlayed: number;
  wins: number;
  vsBotWins: number;
  bestPoints: number;
  fastestWinTurns: number | null;
  avengersTilesWon: number;
  locationsClaimed: number;
};

export const defaultUserStatsSnapshot: UserStatsSnapshot = {
  gamesPlayed: 0,
  wins: 0,
  vsBotWins: 0,
  bestPoints: 0,
  fastestWinTurns: null,
  avengersTilesWon: 0,
  locationsClaimed: 0,
};

/**
 * What one human player did in a single finished game. This is intentionally
 * a plain, engine-agnostic shape — NOT the live `GameState`/`PlayerState`
 * types from `lib/engine/*` (which may still be under active development).
 * Whatever calls `recordGameStats` once the game loop exists is responsible
 * for translating a finished `GameState` into this shape, filtering out
 * bots and guests (their games aren't recorded — see ARCHITECTURE.md §7).
 */
export type PlayerGameOutcome = {
  /** `User.id` of the human player this outcome belongs to. */
  userId: string;
  /** Did this player win the game (ties count as a win for every winner)? */
  isWinner: boolean;
  /** This player's final Infinity Points total when the game ended. */
  points: number;
  /** Number of turns this player took over the course of the game. */
  turns: number;
  /** Did this player hold the Avengers Assemble tile at game end? */
  wonAvengersTile: boolean;
  /** Number of Location tiles this player claimed during the game. */
  locationsClaimed: number;
};

export type FinishedGameResult = {
  /** Matches the `GameMode` enum on `Game` — only VS_BOT games count toward `vsBotWins`. */
  mode: "VS_BOT" | "MULTIPLAYER";
  /** Human (registered-user) participants only; bots/guests are excluded by the caller. */
  players: PlayerGameOutcome[];
};

/**
 * Pure function: given a player's current stats snapshot and what they just
 * did in a finished game, returns their next stats snapshot. No I/O — easy
 * to unit test, and reused by `recordGameStats` below.
 */
export function nextUserStats(
  prev: UserStatsSnapshot,
  outcome: PlayerGameOutcome,
  mode: FinishedGameResult["mode"]
): UserStatsSnapshot {
  const wonVsBot = outcome.isWinner && mode === "VS_BOT";

  return {
    gamesPlayed: prev.gamesPlayed + 1,
    wins: prev.wins + (outcome.isWinner ? 1 : 0),
    vsBotWins: prev.vsBotWins + (wonVsBot ? 1 : 0),
    bestPoints: Math.max(prev.bestPoints, outcome.points),
    fastestWinTurns: outcome.isWinner
      ? prev.fastestWinTurns == null
        ? outcome.turns
        : Math.min(prev.fastestWinTurns, outcome.turns)
      : prev.fastestWinTurns,
    avengersTilesWon: prev.avengersTilesWon + (outcome.wonAvengersTile ? 1 : 0),
    locationsClaimed: prev.locationsClaimed + outcome.locationsClaimed,
  };
}

/**
 * Applies `nextUserStats` for every human participant of a finished game and
 * persists the result, transactionally (per ARCHITECTURE.md §7: "Stats:
 * updated transactionally when a game reaches FINISHED"). Not wired up to
 * anything yet — the game loop that would call this lives in future phases.
 */
export async function recordGameStats(result: FinishedGameResult): Promise<void> {
  if (result.players.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const outcome of result.players) {
      const existing = await tx.userStats.findUnique({ where: { userId: outcome.userId } });
      const prev = existing ?? defaultUserStatsSnapshot;
      const next = nextUserStats(prev, outcome, result.mode);

      await tx.userStats.upsert({
        where: { userId: outcome.userId },
        create: { userId: outcome.userId, ...next },
        update: next,
      });
    }
  });
}
