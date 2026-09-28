/**
 * Applies an already-validated Move to a GameState, returning a NEW state.
 * The input state is never mutated. Callers must run validateMove first —
 * this module assumes the move is legal and does no re-validation.
 *
 * End-of-turn automatics run in rulebook order after the primary action:
 *   1. Time Stone grant (first Level-3 recruit ever, per player)
 *   2. Avengers Assemble tile claim/steal
 *   3. Location auto-claim (or a CHOOSE_LOCATION pending on a tie)
 *   4. Hand-limit check (a RETURN_TOKENS pending if over 10 tokens)
 * A turn only actually advances (currentSeat moves on) once no pending
 * action remains — resolving a pending action can itself cascade into the
 * next automatic (e.g. choosing a Location can still trigger hand-limit).
 */
import { getCard, getLocation } from "./data";
import { pickWinners, qualifiesForWin, qualifyingLocations, recruitCost } from "./rules";
import {
  AVENGERS_TILE_POINTS,
  HAND_LIMIT,
  STONES,
  TAGS_TO_CLAIM_AVENGERS,
  TOKEN_COLORS,
  totalTokens,
  type CardLevel,
  type GameState,
  type Move,
  type PendingAction,
  type PlayerState,
  type TokenColor,
} from "./types";

export function applyMove(state: GameState, seat: number, move: Move): GameState {
  let next = cloneState(state);

  if (move.type === "FORFEIT") {
    // ponytail: ends the game for the whole table. Hand the seat to a bot
    // instead if 3-4 player games should carry on without the quitter.
    const others = next.players.filter((p) => p.seat !== seat);
    return {
      ...next,
      moveCount: next.moveCount + 1,
      pending: null,
      status: "finished",
      ...pickWinners(others, next.avengersHolder),
    };
  }

  // The clock running out takes nobody's turn: whoever is up still plays, and
  // the game ends once the round is complete, or at once if it already is.
  if (move.type === "END_BY_CLOCK") {
    next.clockExpired = true;
    next.moveCount += 1;
    return next.pending ? next : finalizeIfNeeded(next);
  }

  if (move.type === "TIMEOUT_SKIP") {
    const actingSeat = next.currentSeat;
    while (next.pending) {
      next = resolvePendingWithDefault(next, actingSeat);
    }
    next.moveCount += 1;
    next = latchEndTrigger(next);
    next = advanceTurn(next);
    next = finalizeIfNeeded(next);
    return next;
  }

  switch (move.type) {
    case "TAKE_TOKENS":
      next = applyTakeTokens(next, seat, move.colors);
      break;
    case "RESERVE":
      next = applyReserve(next, seat, move);
      break;
    case "RECRUIT":
      next = applyRecruit(next, seat, move);
      break;
    case "RETURN_TOKENS":
      next = applyReturnTokens(next, seat, move.tokens);
      break;
    case "CHOOSE_LOCATION":
      next = applyChooseLocation(next, seat, move.locationId);
      break;
  }

  next.moveCount += 1;
  next = latchEndTrigger(next);

  if (!next.pending) {
    next = advanceTurn(next);
    next = finalizeIfNeeded(next);
  }

  return next;
}

// ---------------------------------------------------------------------------
// Primary actions
// ---------------------------------------------------------------------------

function applyTakeTokens(state: GameState, seat: number, colors: readonly (typeof STONES)[number][]): GameState {
  const player = state.players[seat];
  const tokens = { ...player.tokens };
  const supply = { ...state.supply };
  for (const c of colors) {
    tokens[c] += 1;
    supply[c] -= 1;
  }
  const players = replacePlayer(state.players, seat, { ...player, tokens });
  return runHandLimitCheck({ ...state, players, supply }, seat);
}

function applyReserve(state: GameState, seat: number, move: Extract<Move, { type: "RESERVE" }>): GameState {
  const player = state.players[seat];
  let market = state.market;
  let decks = state.decks;
  let cardId: string;
  let hidden: boolean;

  if (move.from === "market") {
    cardId = move.cardId;
    hidden = false;
    const { market: m, decks: d } = drawIntoMarketSlot(state, move.level, cardId);
    market = m;
    decks = d;
  } else {
    const deck = [...decks[move.level]];
    cardId = deck.shift()!;
    hidden = true;
    decks = { ...decks, [move.level]: deck } as GameState["decks"];
  }

  const tokens = { ...player.tokens };
  const supply = { ...state.supply };
  if (supply.shield > 0) {
    tokens.shield += 1;
    supply.shield -= 1;
  }

  const reserved = [...player.reserved, { cardId, hidden }];
  const players = replacePlayer(state.players, seat, { ...player, reserved, tokens });
  return runHandLimitCheck({ ...state, players, market, decks, supply }, seat);
}

function applyRecruit(state: GameState, seat: number, move: Extract<Move, { type: "RECRUIT" }>): GameState {
  const player = state.players[seat];
  const card = getCard(move.cardId);
  const { need, shieldNeeded } = recruitCost(card, player);

  const tokens = { ...player.tokens };
  const supply = { ...state.supply };
  for (const s of STONES) {
    const owe = need[s] ?? 0;
    const fromTokens = Math.min(owe, tokens[s]);
    tokens[s] -= fromTokens;
    supply[s] += fromTokens;
  }
  tokens.shield -= shieldNeeded;
  supply.shield += shieldNeeded;

  const bonuses = { ...player.bonuses, [card.bonus]: player.bonuses[card.bonus] + 1 };
  const points = player.points + card.points;
  const tags = player.tags + card.tags;
  const cards = [...player.cards, card.id];

  let market = state.market;
  let decks = state.decks;
  let reserved = player.reserved;
  if (move.from === "market") {
    const { market: m, decks: d } = drawIntoMarketSlot(state, card.level, card.id);
    market = m;
    decks = d;
  } else {
    reserved = player.reserved.filter((r) => r.cardId !== card.id);
  }

  let updatedPlayer: PlayerState = { ...player, tokens, bonuses, points, tags, cards, reserved };
  let players = replacePlayer(state.players, seat, updatedPlayer);
  let next: GameState = { ...state, players, supply, market, decks };

  // 1. Time Stone: first-ever Level 3 recruit for this player.
  if (card.level === 3 && updatedPlayer.tokens.time === 0 && next.supply.time > 0) {
    updatedPlayer = {
      ...updatedPlayer,
      tokens: { ...updatedPlayer.tokens, time: updatedPlayer.tokens.time + 1 },
    };
    players = replacePlayer(next.players, seat, updatedPlayer);
    next = { ...next, players, supply: { ...next.supply, time: next.supply.time - 1 } };
  }

  // 2. Avengers Assemble tile.
  next = runAvengersCheck(next, seat);

  // 3 + 4. Location auto-claim (or CHOOSE_LOCATION pending), then hand limit.
  next = runLocationThenHandLimit(next, seat);

  return next;
}

function applyReturnTokens(
  state: GameState,
  seat: number,
  toReturn: Partial<Record<TokenColor, number>>,
): GameState {
  const player = state.players[seat];
  const tokens = { ...player.tokens };
  const supply = { ...state.supply };
  for (const c of TOKEN_COLORS) {
    const amt = toReturn[c] ?? 0;
    if (amt > 0) {
      tokens[c] -= amt;
      supply[c] += amt;
    }
  }
  const players = replacePlayer(state.players, seat, { ...player, tokens });
  return { ...state, players, supply, pending: null };
}

function applyChooseLocation(state: GameState, seat: number, locationId: string): GameState {
  const claimed = claimLocation(state, seat, locationId);
  return runHandLimitCheck(claimed, seat);
}

// ---------------------------------------------------------------------------
// End-of-turn automatics
// ---------------------------------------------------------------------------

function runAvengersCheck(state: GameState, seat: number): GameState {
  if (state.avengersHolder === seat) return state;
  const player = state.players[seat];
  const holderTags = state.avengersHolder !== null ? state.players[state.avengersHolder].tags : -1;
  const threshold = state.avengersHolder === null ? TAGS_TO_CLAIM_AVENGERS : holderTags + 1;
  if (player.tags < threshold) return state;

  let players = state.players;
  if (state.avengersHolder !== null) {
    const prevHolder = state.avengersHolder;
    players = players.map((p, i) =>
      i === prevHolder ? { ...p, points: p.points - AVENGERS_TILE_POINTS } : p,
    );
  }
  players = players.map((p, i) => (i === seat ? { ...p, points: p.points + AVENGERS_TILE_POINTS } : p));
  return { ...state, players, avengersHolder: seat };
}

function runLocationThenHandLimit(state: GameState, seat: number): GameState {
  const player = state.players[seat];
  const options = qualifyingLocations(state.locations, player.bonuses);
  if (options.length === 0) return runHandLimitCheck(state, seat);
  if (options.length === 1) return runHandLimitCheck(claimLocation(state, seat, options[0]), seat);
  return { ...state, pending: { type: "CHOOSE_LOCATION", options } };
}

function claimLocation(state: GameState, seat: number, locationId: string): GameState {
  const location = getLocation(locationId);
  const players = state.players.map((p, i) =>
    i === seat ? { ...p, locations: [...p.locations, locationId], points: p.points + location.points } : p,
  );
  const locations = state.locations.filter((id) => id !== locationId);
  return { ...state, players, locations, pending: null };
}

function runHandLimitCheck(state: GameState, seat: number): GameState {
  const total = totalTokens(state.players[seat].tokens);
  if (total <= HAND_LIMIT) return { ...state, pending: null };
  return { ...state, pending: { type: "RETURN_TOKENS", mustReturn: total - HAND_LIMIT } };
}

/** Server default for TIMEOUT_SKIP: resolve whatever is pending. */
function resolvePendingWithDefault(state: GameState, seat: number): GameState {
  const pending = state.pending;
  if (!pending) return state;

  if (pending.type === "RETURN_TOKENS") {
    const tokens = state.players[seat].tokens;
    const candidates = TOKEN_COLORS.filter((c) => c !== "time");
    const toReturn: Partial<Record<TokenColor, number>> = {};
    let remaining = pending.mustReturn;
    while (remaining > 0) {
      let best: TokenColor | null = null;
      let bestHave = -1;
      for (const c of candidates) {
        const have = tokens[c] - (toReturn[c] ?? 0);
        if (have > bestHave) {
          bestHave = have;
          best = c;
        }
      }
      if (!best || bestHave <= 0) break; // shouldn't happen if mustReturn was computed correctly
      toReturn[best] = (toReturn[best] ?? 0) + 1;
      remaining -= 1;
    }
    return applyReturnTokens(state, seat, toReturn);
  }

  return applyChooseLocation(state, seat, pending.options[0]);
}

// ---------------------------------------------------------------------------
// Turn advancement + end-game finalization
// ---------------------------------------------------------------------------

function latchEndTrigger(state: GameState): GameState {
  if (state.endTriggered) return state;
  const anyQualifies = state.players.some((p) => qualifiesForWin(p, state.settings));
  return anyQualifies ? { ...state, endTriggered: true } : state;
}

function advanceTurn(state: GameState): GameState {
  const currentSeat = (state.currentSeat + 1) % state.playerCount;
  const wrapped = currentSeat === state.startingSeat;
  return { ...state, currentSeat, round: wrapped ? state.round + 1 : state.round };
}

/**
 * Only finalizes at a round boundary (currentSeat just wrapped back to
 * startingSeat). Qualification is recomputed fresh rather than trusting the
 * `endTriggered` latch, so a trigger-er who drops below target (e.g. loses
 * the Avengers tile) before the round ends correctly keeps the game going.
 */
function finalizeIfNeeded(state: GameState): GameState {
  if (state.currentSeat !== state.startingSeat) return state;

  if (state.clockExpired) {
    const { winnerSeat, sharedWinners } = pickWinners(state.players, state.avengersHolder);
    return { ...state, status: "finished", winnerSeat, sharedWinners };
  }

  const qualifiers = state.players.filter((p) => qualifiesForWin(p, state.settings));
  if (qualifiers.length === 0) return state;

  const { winnerSeat, sharedWinners } = pickWinners(qualifiers, state.avengersHolder);
  return { ...state, status: "finished", winnerSeat, sharedWinners };
}

// ---------------------------------------------------------------------------
// Cloning / small helpers (treat GameState as immutable)
// ---------------------------------------------------------------------------

function replacePlayer(players: PlayerState[], seat: number, updated: PlayerState): PlayerState[] {
  return players.map((p, i) => (i === seat ? updated : p));
}

function drawIntoMarketSlot(
  state: GameState,
  level: CardLevel,
  cardId: string,
): { market: GameState["market"]; decks: GameState["decks"] } {
  const slots = [...state.market[level]];
  const idx = slots.indexOf(cardId);
  const deck = [...state.decks[level]];
  const draw = deck.length > 0 ? deck.shift()! : null;
  slots[idx] = draw;
  return {
    market: { ...state.market, [level]: slots } as GameState["market"],
    decks: { ...state.decks, [level]: deck } as GameState["decks"],
  };
}

function clonePending(pending: PendingAction | null): PendingAction | null {
  if (!pending) return null;
  if (pending.type === "RETURN_TOKENS") return { ...pending };
  return { ...pending, options: [...pending.options] };
}

function cloneLevels<T>(rec: Record<CardLevel, T[]>): Record<CardLevel, T[]> {
  return { 1: [...rec[1]], 2: [...rec[2]], 3: [...rec[3]] };
}

function clonePlayer(p: PlayerState): PlayerState {
  return {
    ...p,
    tokens: { ...p.tokens },
    bonuses: { ...p.bonuses },
    cards: [...p.cards],
    reserved: p.reserved.map((r) => ({ ...r })),
    locations: [...p.locations],
  };
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map(clonePlayer),
    supply: { ...state.supply },
    decks: cloneLevels(state.decks),
    market: cloneLevels(state.market),
    locations: [...state.locations],
    pending: clonePending(state.pending),
    sharedWinners: state.sharedWinners ? [...state.sharedWinners] : null,
  };
}
