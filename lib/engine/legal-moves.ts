/**
 * Enumerates every syntactically-distinct legal Move for a seat in a given
 * GameState. Referenced (but intentionally left unimplemented) by
 * ARCHITECTURE.md §3 — needed now so the bot policy (lib/bot/policy.ts) can
 * score candidate moves.
 *
 * Mirrors validate.ts's gating exactly:
 *  - Not the seat's turn (or game finished) → no moves.
 *  - A pending action locks the move space to whatever resolves it
 *    (RETURN_TOKENS amounts summing to `mustReturn`, or one of the offered
 *    CHOOSE_LOCATION options).
 *  - Otherwise every legal TAKE_TOKENS / RESERVE / RECRUIT is generated.
 *
 * Every Move this returns is guaranteed to pass `validateMove` — this is
 * asserted exhaustively in tests/bot/legal-moves.test.ts. TIMEOUT_SKIP and
 * END_BY_CLOCK are deliberately excluded: those are server-initiated moves,
 * never a choice available to the player (or a bot standing in for one).
 */
import { getCard } from "./data";
import { canAffordRecruit } from "./rules";
import {
  MAX_RESERVED,
  STONES,
  type CardLevel,
  type GameState,
  type Move,
  type TokenColor,
  type TokenCounts,
} from "./types";

/** Colors a RETURN_TOKENS move may ever include — Time Stone can never be returned. */
const RETURNABLE_COLORS: readonly TokenColor[] = [...STONES, "shield"];
const LEVELS: readonly CardLevel[] = [1, 2, 3];

export function legalMoves(state: GameState, seat: number): Move[] {
  if (state.status === "finished") return [];
  if (seat !== state.currentSeat) return [];

  const player = state.players[seat];

  if (state.pending) {
    if (state.pending.type === "RETURN_TOKENS") {
      return returnTokenMoves(player.tokens, state.pending.mustReturn);
    }
    return state.pending.options.map((locationId) => ({
      type: "CHOOSE_LOCATION" as const,
      locationId,
    }));
  }

  return [...takeTokenMoves(state), ...reserveMoves(state, seat), ...recruitMoves(state, seat)];
}

// ---------------------------------------------------------------------------
// TAKE_TOKENS
// ---------------------------------------------------------------------------

function takeTokenMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  const available = STONES.filter((s) => state.supply[s] >= 1);

  // 3 distinct, 2 distinct, or 1 (validate.ts allows all "fewer than 3" cases
  // voluntarily, not just when forced by scarcity).
  for (const size of [3, 2, 1] as const) {
    for (const combo of combinations(available, size)) {
      moves.push({ type: "TAKE_TOKENS", colors: combo });
    }
  }

  // 2 of the same color, only when that stack has >= 4 remaining.
  for (const s of STONES) {
    if (state.supply[s] >= 4) moves.push({ type: "TAKE_TOKENS", colors: [s, s] });
  }

  return moves;
}

function combinations<T>(items: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > items.length) return [];
  const [head, ...tail] = items;
  const withHead = combinations(tail, k - 1).map((c) => [head, ...c]);
  const withoutHead = combinations(tail, k);
  return [...withHead, ...withoutHead];
}

// ---------------------------------------------------------------------------
// RESERVE
// ---------------------------------------------------------------------------

function reserveMoves(state: GameState, seat: number): Move[] {
  const player = state.players[seat];
  if (player.reserved.length >= MAX_RESERVED) return [];

  const moves: Move[] = [];
  for (const level of LEVELS) {
    for (const cardId of state.market[level]) {
      if (cardId) moves.push({ type: "RESERVE", from: "market", level, cardId });
    }
    if (state.decks[level].length > 0) {
      moves.push({ type: "RESERVE", from: "deck", level });
    }
  }
  return moves;
}

// ---------------------------------------------------------------------------
// RECRUIT
// ---------------------------------------------------------------------------

function recruitMoves(state: GameState, seat: number): Move[] {
  const player = state.players[seat];
  const moves: Move[] = [];

  for (const level of LEVELS) {
    for (const cardId of state.market[level]) {
      if (cardId && canAffordRecruit(getCard(cardId), player)) {
        moves.push({ type: "RECRUIT", from: "market", cardId });
      }
    }
  }
  for (const r of player.reserved) {
    if (canAffordRecruit(getCard(r.cardId), player)) {
      moves.push({ type: "RECRUIT", from: "reserve", cardId: r.cardId });
    }
  }
  return moves;
}

// ---------------------------------------------------------------------------
// RETURN_TOKENS (pending)
// ---------------------------------------------------------------------------

/**
 * Every combination of non-negative per-color amounts (excluding Time Stone,
 * which can never be returned) that sums to exactly `mustReturn` and never
 * exceeds what the player currently holds of that color.
 */
function returnTokenMoves(tokens: TokenCounts, mustReturn: number): Move[] {
  const combos: Partial<Record<TokenColor, number>>[] = [];
  const chosen: Partial<Record<TokenColor, number>> = {};

  function recurse(idx: number, remaining: number): void {
    if (idx === RETURNABLE_COLORS.length) {
      if (remaining === 0) combos.push({ ...chosen });
      return;
    }
    const color = RETURNABLE_COLORS[idx];
    const maxForColor = Math.min(remaining, tokens[color]);
    for (let amt = 0; amt <= maxForColor; amt++) {
      if (amt > 0) chosen[color] = amt;
      else delete chosen[color];
      recurse(idx + 1, remaining - amt);
    }
    delete chosen[color];
  }

  recurse(0, mustReturn);
  return combos.map((tokensToReturn) => ({ type: "RETURN_TOKENS" as const, tokens: tokensToReturn }));
}
