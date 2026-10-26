/** Says yes or no to one move for a seat, with a reason. The engine's apply assumes a move passed here. */
import { isLine } from "./board";
import { getDuelCard } from "./data";
import { canBuy, joinableColors } from "./rules";
import {
  GOLD,
  HAND_LIMIT,
  MAX_RESERVED,

  TOKEN_COLORS,
  totalTokens,
  type DuelMove,
  type DuelState,
  type TokenColor,
} from "./types";

export type ValidationResult = { ok: true } | { ok: false; reason: string };

const OK: ValidationResult = { ok: true };
const fail = (reason: string): ValidationResult => ({ ok: false, reason });

export function validateDuelMove(state: DuelState, seat: number, move: DuelMove): ValidationResult {
  if (state.status === "finished") return fail("Game is already finished.");
  if (seat !== 0 && seat !== 1) return fail("Invalid seat.");
  if (move.type === "FORFEIT") return OK;
  if (move.type === "TIMEOUT_SKIP") return OK;
  if (seat !== state.currentSeat) return fail("It is not this seat's turn.");

  const player = state.players[seat];
  const opponent = state.players[1 - seat];

  if (state.pending) {
    const p = state.pending;
    if (p.type === "PICK_TOKEN") {
      if (move.type !== "PICK_TOKEN") return fail("Pick a token from the board first.");
      const token = state.board[move.space];
      if (!token) return fail("That space is empty.");
      if (token === GOLD) return fail("Gold cannot be taken this way.");
      if (p.color && token !== p.color) return fail(`Pick a ${p.color} token.`);
      return OK;
    }
    if (p.type === "PICK_OPPONENT_TOKEN") {
      if (move.type !== "PICK_OPPONENT_TOKEN") return fail("Pick a token from your opponent first.");
      if (move.color === GOLD) return fail("Gold cannot be taken from your opponent.");
      if ((opponent.tokens[move.color] ?? 0) < 1) return fail("Your opponent has none of that token.");
      return OK;
    }
    if (p.type === "PICK_JOIN_COLOR") {
      if (move.type !== "PICK_JOIN_COLOR") return fail("Pick the color the wild card joins first.");
      if (!joinableColors(player).includes(move.color)) return fail("You own no card of that color.");
      return OK;
    }
    if (p.type === "PICK_ROYAL") {
      if (move.type !== "PICK_ROYAL") return fail("Pick a Royal card first.");
      if (!state.royals.includes(move.royalId)) return fail("That Royal card is not on offer.");
      return OK;
    }
    if (move.type !== "RETURN_TOKENS") return fail("Return tokens down to ten first.");
    return validateReturn(player.tokens, move.tokens, p.mustReturn);
  }

  switch (move.type) {
    case "SPEND_PRIVILEGE":
      if (player.privileges < 1) return fail("You hold no Privilege.");
      if (!state.board.some((t) => t && t !== GOLD)) return fail("There is no token to take.");
      return OK;
    case "REFILL":
      if (state.refilled) return fail("The board was refilled this turn already.");
      if (state.bag.length === 0) return fail("The bag is empty.");
      if (!state.board.includes(null)) return fail("The board is full.");
      return OK;
    case "TAKE_LINE":
      if (!isLine(state.board, move.spaces)) return fail("Take one to three tokens in a straight, unbroken line, not Gold.");
      return OK;
    case "RESERVE": {
      if (player.reserved.length >= MAX_RESERVED) return fail("You already hold three reserved cards.");
      if (!state.board.includes(GOLD)) return fail("There is no Gold on the board to take.");
      if (move.from === "deck") return state.decks[move.level].length > 0 ? OK : fail("That deck is empty.");
      return state.pyramid[getDuelCard(move.cardId).level].includes(move.cardId) ? OK : fail("That card is not in the pyramid.");
    }
    case "BUY": {
      const card = getDuelCard(move.cardId);
      const inPyramid = state.pyramid[card.level].includes(move.cardId);
      const inReserve = player.reserved.some((r) => r.cardId === move.cardId);
      if (!inPyramid && !inReserve) return fail("That card is not in the pyramid or your reserve.");
      if (card.bonus === "wild" && joinableColors(player).length === 0) return fail("A wild card needs a colored card of yours to join.");
      if (!canBuy(move.cardId, player)) return fail("You cannot pay for that card.");
      return OK;
    }
    case "PICK_TOKEN":
    case "PICK_OPPONENT_TOKEN":
    case "PICK_JOIN_COLOR":
    case "PICK_ROYAL":
    case "RETURN_TOKENS":
      return fail("There is nothing to pick right now.");
    default:
      return fail("Unknown move type.");
  }
}

function validateReturn(held: Record<TokenColor, number>, back: Partial<Record<TokenColor, number>>, mustReturn: number): ValidationResult {
  let total = 0;
  for (const t of TOKEN_COLORS) {
    const n = back[t] ?? 0;
    if (!Number.isInteger(n) || n < 0) return fail("Token counts must be whole numbers.");
    if (n > held[t]) return fail(`You hold fewer ${t} tokens than that.`);
    total += n;
  }
  if (total !== mustReturn) return fail(`Return exactly ${mustReturn} token${mustReturn === 1 ? "" : "s"}.`);
  if (totalTokens(held) - total > HAND_LIMIT) return fail("Still over ten tokens.");
  return OK;
}
