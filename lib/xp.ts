import { frameTierFor, type FrameTier } from "@/lib/frame-tier";
import type { UserStatsSnapshot } from "@/lib/record-stats";

/** How much a player has played. Only grows — drives the player-card frame, never rank. */
export function accountScore(stats: UserStatsSnapshot): number {
  return stats.gamesPlayed * 10 + stats.wins * 20 + stats.avengersTilesWon * 5 + stats.locationsClaimed * 5;
}

/** Score needed for `level`: 100×(level−1)^1.5, matching the table in ARCHITECTURE.md. */
export function scoreForLevel(level: number): number {
  return Math.round(100 * (level - 1) ** 1.5);
}

export function accountLevel(score: number): number {
  let level = 1;
  while (score >= scoreForLevel(level + 1)) level++;
  return level;
}

export const ACCOUNT_FRAME_TIER_MIN_LEVEL = [1, 2, 4, 6, 8, 10, 13, 16, 20, 25];

export function accountFrameTier(level: number): FrameTier {
  return frameTierFor(level, ACCOUNT_FRAME_TIER_MIN_LEVEL);
}

/** Where a player stands: their level, and how far through it they are, in XP. */
export function accountProgress(stats: UserStatsSnapshot): { level: number; into: number; span: number } {
  const score = accountScore(stats);
  const level = accountLevel(score);
  const from = scoreForLevel(level);
  return { level, into: score - from, span: scoreForLevel(level + 1) - from };
}

/** The frame tier a player's stats earn them. */
export function accountTierFor(stats: UserStatsSnapshot): FrameTier {
  return accountFrameTier(accountProgress(stats).level);
}
