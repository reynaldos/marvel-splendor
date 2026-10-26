/**
 * Every move a seat may make from a state, for the bot and the tests. A pending choice narrows it to the
 * answers; otherwise the free moves still open and every action.
 */
import { allLines } from "./board";
import { canBuy, joinableColors } from "./rules";
import {
  GOLD,
  MAX_RESERVED,
  TOKEN_COLORS,
  type CardLevel,
  type DuelMove,
  type DuelState,

  type TokenColor,
} from "./types";

export function legalDuelMoves(state: DuelState, seat: number): DuelMove[] {
  if (state.status === "finished" || seat !== state.currentSeat) return [];
  const player = state.players[seat];
  const opponent = state.players[1 - seat];
  const moves: DuelMove[] = [];

  if (state.pending) {
    const p = state.pending;
    if (p.type === "PICK_TOKEN") {
      state.board.forEach((t, space) => {
        if (t && t !== GOLD && (!p.color || t === p.color)) moves.push({ type: "PICK_TOKEN", space });
      });
    } else if (p.type === "PICK_OPPONENT_TOKEN") {
      for (const t of TOKEN_COLORS) if (t !== GOLD && opponent.tokens[t] > 0) moves.push({ type: "PICK_OPPONENT_TOKEN", color: t });
    } else if (p.type === "PICK_JOIN_COLOR") {
      for (const color of joinableColors(player)) moves.push({ type: "PICK_JOIN_COLOR", color });
    } else if (p.type === "PICK_ROYAL") {
      for (const royalId of state.royals) moves.push({ type: "PICK_ROYAL", royalId });
    } else {
      moves.push(...returnMoves(player.tokens, p.mustReturn));
    }
    return moves;
  }

  if (player.privileges > 0 && state.board.some((t) => t && t !== GOLD)) moves.push({ type: "SPEND_PRIVILEGE" });
  if (!state.refilled && state.bag.length > 0 && state.board.includes(null)) moves.push({ type: "REFILL" });

  for (const spaces of allLines(state.board)) moves.push({ type: "TAKE_LINE", spaces });

  if (player.reserved.length < MAX_RESERVED && state.board.includes(GOLD)) {
    for (const level of [1, 2, 3] as CardLevel[]) {
      for (const cardId of state.pyramid[level]) if (cardId) moves.push({ type: "RESERVE", from: "pyramid", cardId });
      if (state.decks[level].length > 0) moves.push({ type: "RESERVE", from: "deck", level });
    }
  }

  const buyable = [
    ...([1, 2, 3] as CardLevel[]).flatMap((level) => state.pyramid[level].filter((id): id is string => Boolean(id))),
    ...player.reserved.map((r) => r.cardId),
  ];
  for (const cardId of buyable) if (canBuy(cardId, player)) moves.push({ type: "BUY", cardId });

  return moves;
}

/** Each way to give back `mustReturn` tokens, one color at a time per step: enough for a bot to pick from. */
function returnMoves(held: Record<TokenColor, number>, mustReturn: number): DuelMove[] {
  const out: DuelMove[] = [];
  const walk = (i: number, left: number, chosen: Partial<Record<TokenColor, number>>) => {
    if (left === 0) return void out.push({ type: "RETURN_TOKENS", tokens: { ...chosen } });
    if (i >= TOKEN_COLORS.length) return;
    const t = TOKEN_COLORS[i];
    for (let n = Math.min(held[t], left); n >= 0; n--) {
      if (n > 0) chosen[t] = n;
      else delete chosen[t];
      walk(i + 1, left - n, chosen);
    }
    delete chosen[t];
  };
  walk(0, mustReturn, {});
  return out;
}
