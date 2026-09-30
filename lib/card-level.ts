import { frameTierFor, type FrameTier } from "@/lib/frame-tier";

export const CARD_LEVEL_TIER_MIN_TIMES = [1, 5, 10, 20, 30, 45, 65, 90, 120, 160];

/** The frame a card earns from `CollectedCard.times` — same ladder as the account-level frame, keyed off recruit count instead. */
export function cardFrameTier(timesRecruited: number): FrameTier {
  return frameTierFor(timesRecruited, CARD_LEVEL_TIER_MIN_TIMES);
}
