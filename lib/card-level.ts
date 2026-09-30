import { frameTierFor, type FrameTier } from "@/lib/frame-tier";

const CARD_LEVEL_TIER_MIN_TIMES = [1, 5, 10, 20, 35, 55, 80, 120];

/** The frame a card earns from `CollectedCard.times` — same ladder as the account-level frame, keyed off recruit count instead. */
export function cardFrameTier(timesRecruited: number): FrameTier {
  return frameTierFor(timesRecruited, CARD_LEVEL_TIER_MIN_TIMES);
}
