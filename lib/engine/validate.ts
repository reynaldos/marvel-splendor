/**
 * Move legality checks. Pure, side-effect-free: given a state and a
 * candidate move from a given seat, says whether `applyMove` may run it.
 */
import { getCard } from "./data";
import { canAffordRecruit } from "./rules";
import {
  MAX_RESERVED,
  TOKEN_COLORS,
  type GameState,
  type Move,
  type Stone,
  type TokenColor,
} from "./types";

export type ValidationResult = { ok: true } | { ok: false; reason: string };

const OK: ValidationResult = { ok: true };
function fail(reason: string): ValidationResult {
  return { ok: false, reason };
}

export function validateMove(state: GameState, seat: number, move: Move): ValidationResult {
  if (state.status === "finished") return fail("Game is already finished.");
  if (!Number.isInteger(seat) || seat < 0 || seat >= state.playerCount) {
    return fail("Invalid seat.");
  }

  const isServerMove = move.type === "TIMEOUT_SKIP" || move.type === "END_BY_CLOCK";
  if (!isServerMove && seat !== state.currentSeat) {
    return fail("It is not this seat's turn.");
  }

  if (state.pending && !isServerMove) {
    if (state.pending.type === "RETURN_TOKENS") {
      if (move.type !== "RETURN_TOKENS") {
        return fail("Must resolve the pending token return first.");
      }
      return validateReturnTokens(state, seat, move.tokens, state.pending.mustReturn);
    }
    if (move.type !== "CHOOSE_LOCATION") {
      return fail("Must resolve the pending Location choice first.");
    }
    return validateChooseLocation(move.locationId, state.pending.options);
  }

  switch (move.type) {
    case "TAKE_TOKENS":
      return validateTakeTokens(state, move.colors);
    case "RESERVE":
      return validateReserve(state, seat, move);
    case "RECRUIT":
      return validateRecruit(state, seat, move);
    case "RETURN_TOKENS":
      return fail("There is no pending token return to resolve.");
    case "CHOOSE_LOCATION":
      return fail("There is no pending Location choice to resolve.");
    case "TIMEOUT_SKIP":
    case "END_BY_CLOCK":
      return OK;
    default:
      return fail("Unknown move type.");
  }
}

function validateTakeTokens(state: GameState, colors: Stone[]): ValidationResult {
  if (colors.length === 0) return fail("Must take at least one token.");
  if (colors.length > 3) return fail("Cannot take more than 3 tokens in one turn.");

  const allSame = colors.every((c) => c === colors[0]);
  if (colors.length === 2 && allSame) {
    const c = colors[0];
    if (state.supply[c] < 4) {
      return fail(`Can only take 2 of ${c} if at least 4 remain in supply.`);
    }
    return OK;
  }

  const distinct = new Set(colors);
  if (distinct.size !== colors.length) {
    return fail("Can only take 2 tokens of the same color, never 3 (and never a mix of 2+1).");
  }
  for (const c of colors) {
    if (state.supply[c] < 1) return fail(`No ${c} tokens remain in the supply.`);
  }
  return OK;
}

function validateReserve(
  state: GameState,
  seat: number,
  move: Extract<Move, { type: "RESERVE" }>,
): ValidationResult {
  const player = state.players[seat];
  if (player.reserved.length >= MAX_RESERVED) {
    return fail(`Cannot reserve more than ${MAX_RESERVED} cards.`);
  }
  if (move.from === "market") {
    const slots = state.market[move.level];
    if (!slots.includes(move.cardId)) return fail("That card is not currently in the market.");
  } else {
    if (state.decks[move.level].length === 0) {
      return fail(`Level ${move.level} deck is empty.`);
    }
  }
  return OK;
}

function validateRecruit(
  state: GameState,
  seat: number,
  move: Extract<Move, { type: "RECRUIT" }>,
): ValidationResult {
  const player = state.players[seat];
  let card;
  try {
    card = getCard(move.cardId);
  } catch {
    return fail("Unknown card id.");
  }

  if (move.from === "market") {
    if (!state.market[card.level].includes(move.cardId)) {
      return fail("That card is not currently in the market.");
    }
  } else {
    if (!player.reserved.some((r) => r.cardId === move.cardId)) {
      return fail("That card is not in your reserve.");
    }
  }

  if (!canAffordRecruit(card, player)) {
    return fail("Cannot afford this card's cost.");
  }
  return OK;
}

function validateReturnTokens(
  state: GameState,
  seat: number,
  tokens: Partial<Record<TokenColor, number>>,
  mustReturn: number,
): ValidationResult {
  const player = state.players[seat];
  let total = 0;
  for (const c of TOKEN_COLORS) {
    const amt = tokens[c] ?? 0;
    if (!Number.isInteger(amt) || amt < 0) return fail(`Invalid return amount for ${c}.`);
    if (c === "time" && amt > 0) return fail("The Time Stone can never be returned.");
    if (amt > player.tokens[c]) return fail(`Cannot return more ${c} tokens than currently held.`);
    total += amt;
  }
  if (total !== mustReturn) return fail(`Must return exactly ${mustReturn} tokens.`);
  return OK;
}

function validateChooseLocation(locationId: string, options: string[]): ValidationResult {
  if (!options.includes(locationId)) {
    return fail("That Location is not one of the offered options.");
  }
  return OK;
}
