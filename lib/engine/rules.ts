/**
 * Pure rule helpers shared by validate.ts and apply.ts.
 *
 * Rule source: ARCHITECTURE.md §1 (verified against the official rulebook).
 * Notably:
 *  - S.H.I.E.L.D. (shield/gray) is the wildcard token, granted for reserving,
 *    and substitutes for any stone shortfall when paying a recruit cost.
 *  - Time Stone (time/green) is granted at most once per player, ever, the
 *    first time they recruit a Level 3 card. It is never spent and never
 *    returned; it only matters for the compound win condition.
 */
import { getLocation } from "./data";
import {
  STONES,
  type Card,
  type GameSettings,
  type Location,
  type PlayerState,
  type StoneCounts,
} from "./types";

/**
 * Per-stone token need after bonus discount, plus how many wildcard
 * (shield) tokens are required to cover whatever the player's own stone
 * tokens can't. Payment policy: spend matching stone tokens first, then
 * fill any remaining shortfall with shield — the `Move` shape carries no
 * explicit payment breakdown, so the engine must pick a deterministic
 * policy, and minimizing shield usage is the only rational one.
 */
export function recruitCost(
  card: Card,
  player: PlayerState,
): { need: Partial<StoneCounts>; shieldNeeded: number } {
  const need: Partial<StoneCounts> = {};
  let shieldNeeded = 0;
  for (const s of STONES) {
    const raw = card.cost[s] ?? 0;
    const afterBonus = Math.max(0, raw - player.bonuses[s]);
    if (afterBonus > 0) need[s] = afterBonus;
    const shortfall = Math.max(0, afterBonus - player.tokens[s]);
    shieldNeeded += shortfall;
  }
  return { need, shieldNeeded };
}

export function canAffordRecruit(card: Card, player: PlayerState): boolean {
  return recruitCost(card, player).shieldNeeded <= player.tokens.shield;
}

export function qualifiesForLocation(location: Location, bonuses: StoneCounts): boolean {
  return STONES.every((s) => bonuses[s] >= (location.requires[s] ?? 0));
}

/** Location ids (among those still on offer) a player's current bonuses satisfy. */
export function qualifyingLocations(availableLocationIds: string[], bonuses: StoneCounts): string[] {
  return availableLocationIds.filter((id) => qualifiesForLocation(getLocation(id), bonuses));
}

/**
 * Compound win condition (rulebook): >= targetPoints AND at least one bonus
 * of each of the 5 basic colors AND holding the Time Stone. `targetPoints`
 * is the only part of this that GameSettings can tune.
 */
export function qualifiesForWin(player: PlayerState, settings: GameSettings): boolean {
  return (
    player.points >= settings.targetPoints &&
    STONES.every((s) => player.bonuses[s] >= 1) &&
    player.tokens.time >= 1
  );
}

/**
 * Rulebook tiebreak order among a candidate pool:
 * (1) most points; (2) Avengers Assemble tile holder; (3) fewest character
 * cards; (4) shared victory (true tie).
 */
export function pickWinners(
  candidates: PlayerState[],
  avengersHolder: number | null,
): { winnerSeat: number | null; sharedWinners: number[] | null } {
  if (candidates.length === 0) return { winnerSeat: null, sharedWinners: null };
  if (candidates.length === 1) return { winnerSeat: candidates[0].seat, sharedWinners: null };

  const maxPoints = Math.max(...candidates.map((p) => p.points));
  let pool = candidates.filter((p) => p.points === maxPoints);
  if (pool.length === 1) return { winnerSeat: pool[0].seat, sharedWinners: null };

  const holderInPool = pool.find((p) => p.seat === avengersHolder);
  if (holderInPool) return { winnerSeat: holderInPool.seat, sharedWinners: null };

  const minCards = Math.min(...pool.map((p) => p.cards.length));
  pool = pool.filter((p) => p.cards.length === minCards);
  if (pool.length === 1) return { winnerSeat: pool[0].seat, sharedWinners: null };

  return { winnerSeat: null, sharedWinners: pool.map((p) => p.seat).sort((a, b) => a - b) };
}
