import { CARD_LEVEL_TIER_MIN_TIMES } from "@/lib/card-level";
import { frameTierFor, type FrameTier } from "@/lib/frame-tier";
import type { UserStatsSnapshot } from "@/lib/record-stats";

/** XP for each level a card in the collection has climbed past Recruited. Small next to a game's 10, so collecting never outweighs playing. */
export const CARD_LEVEL_XP = 5;

/** XP from card levels, given how many times each collected card has been recruited. */
export function cardLevelXp(timesRecruited: number[]): number {
  return timesRecruited.reduce(
    (xp, times) => xp + CARD_LEVEL_XP * Math.max(0, CARD_LEVEL_TIER_MIN_TIMES.filter((min) => times >= min).length - 1),
    0,
  );
}

/** How much a player has played and collected. Only grows — drives the player-card frame, never rank. */
export function accountScore(stats: UserStatsSnapshot, cardXp: number): number {
  return stats.gamesPlayed * 10 + stats.wins * 20 + stats.avengersTilesWon * 5 + stats.locationsClaimed * 5 + cardXp;
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

export interface Progress {
  level: number;
  /** XP into this level, and how much the level spans. */
  into: number;
  span: number;
}

/** Where a score stands: its level, and how far through it, in XP. */
export function progressForScore(score: number): Progress {
  const level = accountLevel(score);
  const from = scoreForLevel(level);
  return { level, into: score - from, span: scoreForLevel(level + 1) - from };
}

/** Where a player stands: their level, and how far through it they are, in XP. */
export function accountProgress(stats: UserStatsSnapshot, cardXp: number): Progress {
  return progressForScore(accountScore(stats, cardXp));
}

/** The frame tier a player's stats earn them. */
export function accountTierFor(stats: UserStatsSnapshot, cardXp: number): FrameTier {
  return accountFrameTier(accountProgress(stats, cardXp).level);
}
