/**
 * Applies a validated Duel move and returns a new state; the input is never
 * changed. A turn runs: any free moves (Privileges spent, one refill), one
 * action (a line, a reserve, a buy), then the card's power, Royals earned, the
 * hand limit, and the win check. Each may leave a choice pending; the turn
 * ends on its own once nothing is pending, and `currentSeat` moves on unless
 * the player earned another turn.
 */
import { refill } from "./board";
import { getDuelCard, getRoyal } from "./data";
import { legalDuelMoves } from "./legal-moves";
import { buyCost, crownsOf, hasWon, joinableColors, lineOwesPrivilege } from "./rules";
import {
  GOLD,
  HAND_LIMIT,
  ROYAL_CROWNS,
  TOKEN_COLORS,
  totalTokens,
  type Ability,
  type CardLevel,
  type DuelMove,
  type DuelPlayer,
  type DuelState,
  type Stone,
  type TokenColor,
} from "./types";

export function applyDuelMove(state: DuelState, seat: number, move: DuelMove): DuelState {
  let next = clone(state);
  const me = () => next.players[seat];

  if (move.type === "FORFEIT") {
    return { ...next, moveCount: next.moveCount + 1, pending: null, status: "finished", winnerSeat: 1 - seat };
  }

  if (move.type === "TIMEOUT_SKIP") {
    const acting = next.currentSeat;
    // Only a turn nobody showed up for is a missed one; a choice left waiting means they had moved.
    if (!move.stuck && !move.present && !next.pending) {
      next.players[acting].missedTurns = (next.players[acting].missedTurns ?? 0) + 1;
    }
    while (next.pending) next = applyDuelMove(next, acting, legalDuelMoves(next, acting)[0]);
    next.moveCount += 1;
    return endTurn(next, acting);
  }

  switch (move.type) {
    case "SPEND_PRIVILEGE":
      me().privileges -= 1;
      next.privileges += 1;
      next.pending = { type: "PICK_TOKEN", reason: "privilege" };
      break;
    case "REFILL": {
      Object.assign(next, refill(next));
      next.refilled = true;
      owePrivilege(next, 1 - seat);
      break;
    }
    case "TAKE_LINE": {
      const taken = move.spaces.map((s) => next.board[s]!);
      for (const s of move.spaces) next.board[s] = null;
      for (const t of taken) me().tokens[t] += 1;
      if (lineOwesPrivilege(taken)) owePrivilege(next, 1 - seat);
      next = afterAction(next, seat);
      break;
    }
    case "RESERVE": {
      next.board[next.board.indexOf(GOLD)] = null;
      me().tokens[GOLD] += 1;
      if (move.from === "deck") {
        me().reserved.push({ cardId: next.decks[move.level].shift()!, blind: true });
      } else {
        takeFromPyramid(next, move.cardId);
        me().reserved.push({ cardId: move.cardId, blind: false });
      }
      next = afterAction(next, seat);
      break;
    }
    case "BUY": {
      const card = getDuelCard(move.cardId);
      const { pay } = buyCost(move.cardId, me());
      for (const t of TOKEN_COLORS) {
        const n = pay[t] ?? 0;
        if (n > 0) {
          me().tokens[t] -= n;
          next.bag.push(...Array<TokenColor>(n).fill(t));
        }
      }
      if (me().reserved.some((r) => r.cardId === move.cardId)) {
        me().reserved = me().reserved.filter((r) => r.cardId !== move.cardId);
      } else {
        takeFromPyramid(next, move.cardId);
      }
      me().cards.push({ cardId: move.cardId });
      if (card.bonus === "wild") {
        // With one color to join there is nothing to ask.
        const colors = joinableColors(me());
        if (colors.length === 1) me().cards[me().cards.length - 1].joined = colors[0];
        else next.pending = { type: "PICK_JOIN_COLOR", cardId: move.cardId };
      }
      if (!next.pending) next = resolvePower(next, seat, card.ability, card.bonus);
      next = afterAction(next, seat);
      break;
    }
    case "PICK_TOKEN": {
      const t = next.board[move.space]!;
      next.board[move.space] = null;
      me().tokens[t] += 1;
      next.pending = null;
      // A Privilege is spent before the action, so the turn stays open; a power's pick is mid-action.
      if (state.pending?.type === "PICK_TOKEN" && state.pending.reason === "token") next = afterAction(next, seat);
      break;
    }
    case "PICK_OPPONENT_TOKEN": {
      next.players[1 - seat].tokens[move.color] -= 1;
      me().tokens[move.color] += 1;
      next.pending = null;
      next = afterAction(next, seat);
      break;
    }
    case "PICK_JOIN_COLOR": {
      const pending = state.pending as { type: "PICK_JOIN_COLOR"; cardId: string };
      const owned = me().cards.find((c) => c.cardId === pending.cardId && !c.joined)!;
      owned.joined = move.color;
      next.pending = null;
      const card = getDuelCard(pending.cardId);
      next = resolvePower(next, seat, card.ability, card.bonus);
      next = afterAction(next, seat);
      break;
    }
    case "PICK_ROYAL": {
      next.royals = next.royals.filter((id) => id !== move.royalId);
      me().royals.push(move.royalId);
      next.pending = null;
      next = resolvePower(next, seat, getRoyal(move.royalId).ability, null);
      next = afterAction(next, seat);
      break;
    }
    case "RETURN_TOKENS": {
      for (const t of TOKEN_COLORS) {
        const n = move.tokens[t] ?? 0;
        if (n > 0) {
          me().tokens[t] -= n;
          next.bag.push(...Array<TokenColor>(n).fill(t));
        }
      }
      next.pending = null;
      next = afterAction(next, seat);
      break;
    }
  }

  // Playing ends a run of missed turns.
  if (me().missedTurns) me().missedTurns = 0;
  next.moveCount += 1;
  return next;
}

/** A card's power once bought, or a Royal's once taken. `wild` is the join itself, done already. */
function resolvePower(state: DuelState, seat: number, ability: Ability | null, color: Stone | "wild" | null): DuelState {
  const opponent = state.players[1 - seat];
  switch (ability) {
    case "again":
      state.extraTurn = true;
      break;
    case "token":
      // Of this card's color, if any is on the board; a wild card's "color" is none.
      if (color && color !== "wild" && state.board.includes(color)) state.pending = { type: "PICK_TOKEN", color, reason: "token" };
      break;
    case "privilege":
      owePrivilege(state, seat);
      break;
    case "steal":
      if (TOKEN_COLORS.some((t) => t !== GOLD && opponent.tokens[t] > 0)) state.pending = { type: "PICK_OPPONENT_TOKEN" };
      break;
    case "wild":
    case null:
      break;
  }
  return state;
}

/**
 * What follows the action and each resolved choice, in order: a Royal earned, the hand limit, the win, and
 * then the end of the turn. Stops at the first thing that needs the player to choose.
 */
function afterAction(state: DuelState, seat: number): DuelState {
  if (state.pending) return state;
  const me = state.players[seat];
  const crowns = crownsOf(me);
  const earned = Math.min(2, Math.floor(crowns / ROYAL_CROWNS));
  if (earned > me.royals.length && state.royals.length > 0) {
    state.pending = { type: "PICK_ROYAL" };
    return state;
  }
  const over = totalTokens(me.tokens) - HAND_LIMIT;
  if (over > 0) {
    state.pending = { type: "RETURN_TOKENS", mustReturn: over };
    return state;
  }
  return endTurn(state, seat);
}

/** The win check, then the next seat: the same one again if a power said so. */
function endTurn(state: DuelState, seat: number): DuelState {
  if (hasWon(state.players[seat])) {
    return { ...state, pending: null, status: "finished", winnerSeat: seat };
  }
  state.currentSeat = state.extraTurn ? seat : 1 - seat;
  state.extraTurn = false;
  state.refilled = false;
  state.pending = null;
  return state;
}

/** Hands a Privilege to `toSeat`: from the table, else from the other player, else nothing. */
function owePrivilege(state: DuelState, toSeat: number): void {
  if (state.privileges > 0) {
    state.privileges -= 1;
    state.players[toSeat].privileges += 1;
  } else if (state.players[1 - toSeat].privileges > 0) {
    state.players[1 - toSeat].privileges -= 1;
    state.players[toSeat].privileges += 1;
  }
}

/** Removes a card from the pyramid and deals its deck's top card into the gap, if any. */
function takeFromPyramid(state: DuelState, cardId: string): void {
  const level: CardLevel = getDuelCard(cardId).level;
  const slot = state.pyramid[level].indexOf(cardId);
  state.pyramid[level][slot] = state.decks[level].shift() ?? null;
}

function clone(state: DuelState): DuelState {
  const player = (p: DuelPlayer): DuelPlayer => ({
    ...p,
    tokens: { ...p.tokens },
    cards: p.cards.map((c) => ({ ...c })),
    reserved: p.reserved.map((r) => ({ ...r })),
    royals: [...p.royals],
  });
  return {
    ...state,
    players: [player(state.players[0]), player(state.players[1])],
    board: [...state.board],
    bag: [...state.bag],
    decks: { 1: [...state.decks[1]], 2: [...state.decks[2]], 3: [...state.decks[3]] },
    pyramid: { 1: [...state.pyramid[1]], 2: [...state.pyramid[2]], 3: [...state.pyramid[3]] },
    royals: [...state.royals],
    pending: state.pending ? { ...state.pending } : null,
  };
}
