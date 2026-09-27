/**
 * Client-side "can I afford this" estimate for visual hints (affordable
 * card ring, disabled Recruit buttons). Mirrors ARCHITECTURE.md §1 step 4:
 * "Pay cost minus 1 per matching owned bonus; gray is wild." This is a
 * presentational approximation only — `lib/engine/rules.ts` (off-limits to
 * import per the task brief) is the real source of truth, enforced
 * server-side on submit.
 */
import { STONES, type Card, type StoneCounts, type TokenCounts } from "@/lib/engine/types";

export interface Affordability {
  affordable: boolean;
  /** How many S.H.I.E.L.D. (wild) tokens would be needed to cover the gap. */
  shieldNeeded: number;
}

export function estimateAffordability(
  card: Card,
  tokens: TokenCounts,
  bonuses: StoneCounts,
): Affordability {
  let shieldNeeded = 0;
  for (const stone of STONES) {
    const cost = card.cost[stone] ?? 0;
    const afterBonus = Math.max(0, cost - bonuses[stone]);
    const have = tokens[stone];
    if (have < afterBonus) shieldNeeded += afterBonus - have;
  }
  return { affordable: shieldNeeded <= tokens.shield, shieldNeeded };
}
