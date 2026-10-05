import { CARD_BY_ID } from "@/lib/engine/data";
import type { CardLevel } from "@/lib/engine/types";
import { frameTierFor, type FrameTier } from "@/lib/frame-tier";
import progression from "@/lib/progression.json";

/** Recruits for each tier, by card level, from lib/progression.json: a level 1 card comes round far more often than a level 3, so it has further to climb. */
export const CARD_LEVEL_TIER_MIN_TIMES: Record<CardLevel, number[]> = progression.cardLevelTierMinTimes;

/** The ladder for a card; an unknown id climbs like a level 2 card. */
function cardTierMinTimes(cardId: string): number[] {
  return CARD_LEVEL_TIER_MIN_TIMES[CARD_BY_ID.get(cardId)?.level ?? 2];
}

/** Levels a card has climbed from `CollectedCard.times`, the first recruit included: 0 unseen, 1 Recruited, 10 Mastered. */
export function cardLevelsClimbed(cardId: string, timesRecruited: number): number {
  return cardTierMinTimes(cardId).filter((min) => timesRecruited >= min).length;
}

/** The frame a card earns from `CollectedCard.times` — same ladder as the account-level frame, keyed off recruit count instead. */
export function cardFrameTier(cardId: string, timesRecruited: number): FrameTier {
  return frameTierFor(timesRecruited, cardTierMinTimes(cardId));
}
