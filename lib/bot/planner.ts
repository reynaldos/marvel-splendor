/**
 * The hard bot. Where the others take whichever move leaves the board
 * looking best, this one plans: it looks several of its own turns ahead,
 * following only the most promising lines, and judges where each ends by how
 * close it is to winning. It also watches the table, and will take the card
 * an opponent needs to win. It has no randomness: the same board always
 * gives the same move.
 */
import { applyMove } from "@/lib/engine/apply";
import { getCard, getLocation } from "@/lib/engine/data";
import { legalMoves } from "@/lib/engine/legal-moves";
import { canAffordRecruit, qualifiesForWin, recruitCost } from "@/lib/engine/rules";
import { STONES, TAGS_TO_CLAIM_AVENGERS, totalTokens, type Card, type GameState, type Move, type PlayerState } from "@/lib/engine/types";

/** Turns of its own it looks ahead, counting the one it is about to take. */
const DEPTH = 3;
/** Lines kept at each turn looked ahead; the rest are dropped. */
const WIDTH = 5;
/** What a later turn is worth beside the same thing now: sooner is better. */
const LATER = 0.9;

const WON = 1000;

function visibleCards(state: GameState, player: PlayerState): Card[] {
  const market = [1, 2, 3].flatMap((level) => state.market[level as 1 | 2 | 3]).flatMap((id) => (id ? [getCard(id)] : []));
  return [...market, ...player.reserved.map((r) => getCard(r.cardId))];
}

/** How far a player is from winning, as a score: higher is closer. */
export function standing(state: GameState, seat: number): number {
  const player = state.players[seat];
  if (state.status === "finished") {
    const won = state.winnerSeat === seat || (state.sharedWinners?.includes(seat) ?? false);
    return (won ? WON : -WON) + player.points;
  }
  const target = state.settings.targetPoints;
  const colours = STONES.filter((s) => player.bonuses[s] >= 1).length;
  const hasTime = player.tokens.time >= 1;

  // The three things a win takes. Points past the target are worth little.
  let score = 10 * Math.min(player.points, target) + 2 * Math.max(0, player.points - target);
  score += 5 * colours + (colours === 5 ? 6 : 0);
  score += hasTime ? 24 : 0;
  if (qualifiesForWin(player, state.settings)) score += 60;

  // Cards make every later card cheaper, which matters most early on.
  const early = Math.max(0.25, 1 - player.points / target);
  score += early * STONES.reduce((sum, s) => sum + 3.2 * Math.min(player.bonuses[s], 4) + 1 * Math.max(0, player.bonuses[s] - 4), 0);

  // Tokens in hand are turns already spent, as long as there is room to take more.
  const held = totalTokens(player.tokens) - player.tokens.time;
  score += 1.1 * Math.min(held, 8) - 1.5 * Math.max(0, held - 8) + 0.6 * player.tokens.shield;

  // The Avengers tile.
  if (state.avengersHolder === seat) score += 2;
  else {
    const needed = state.avengersHolder === null ? TAGS_TO_CLAIM_AVENGERS : state.players[state.avengersHolder].tags + 1;
    score += 6 * Math.min(1, player.tags / needed);
  }

  // The nearest Location.
  let nearest = Infinity;
  for (const id of state.locations) {
    const { requires } = getLocation(id);
    const short = STONES.reduce((sum, s) => sum + Math.max(0, (requires[s] ?? 0) - player.bonuses[s]), 0);
    nearest = Math.min(nearest, short);
  }
  if (nearest < Infinity) score += 12 / (1 + nearest);

  // The best two cards in reach, by what they give for the tokens still to find.
  const worth = visibleCards(state, player)
    .map((card) => {
      const { shieldNeeded } = recruitCost(card, player);
      const short = Math.max(0, shieldNeeded - player.tokens.shield);
      const gives =
        10 * card.points +
        3 * card.tags +
        (player.bonuses[card.bonus] === 0 ? 8 : 3 * early) +
        (card.level === 3 && !hasTime ? 22 : 0);
      return gives / (2 + short);
    })
    .sort((a, b) => b - a);
  score += 0.5 * (worth[0] ?? 0) + 0.25 * (worth[1] ?? 0);

  // A reserved card that is still far off is a slot gone for good.
  for (const r of player.reserved) score -= 0.4 * Math.max(0, recruitCost(getCard(r.cardId), player).shieldNeeded - 4);

  return score;
}

/** Takes a move, and then any choice it leaves to be made, each the way that stands best. */
function take(state: GameState, seat: number, move: Move): GameState {
  let next = applyMove(state, seat, move);
  while (next.status === "active" && next.pending && next.currentSeat === seat) {
    let best: GameState | null = null;
    let bestScore = -Infinity;
    for (const choice of legalMoves(next, seat)) {
      const after = applyMove(next, seat, choice);
      const score = standing(after, seat);
      if (score > bestScore) [best, bestScore] = [after, score];
    }
    if (!best) break;
    next = best;
  }
  return next;
}

/** The best standing reachable from here in `turns` more turns of the bot's own, the table left as it is. */
function lookAhead(state: GameState, seat: number, turns: number): number {
  const here = standing(state, seat);
  if (turns === 0 || state.status !== "active") return here;
  // As if it were the bot's turn again at once.
  const mine: GameState = { ...state, currentSeat: seat, pending: null };
  const lines = legalMoves(mine, seat)
    .map((move) => take(mine, seat, move))
    .map((after) => ({ after, score: standing(after, seat) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, WIDTH);
  let best = here;
  for (const { after } of lines) best = Math.max(best, lookAhead(after, seat, turns - 1));
  // Getting there later is worth a little less than being there now.
  return here + LATER * (best - here);
}

/** The cards on show that would win the game for an opponent who recruited one on their next turn. */
function winningCards(state: GameState, seat: number): Set<string> {
  const cards = new Set<string>();
  for (const opponent of state.players) {
    if (opponent.seat === seat) continue;
    for (const card of visibleCards(state, opponent)) {
      if (!canAffordRecruit(card, opponent)) continue;
      const after: PlayerState = {
        ...opponent,
        points: opponent.points + card.points,
        bonuses: { ...opponent.bonuses, [card.bonus]: opponent.bonuses[card.bonus] + 1 },
        tokens: { ...opponent.tokens, time: card.level === 3 ? 1 : opponent.tokens.time },
      };
      if (qualifiesForWin(after, state.settings)) cards.add(card.id);
    }
  }
  return cards;
}

/** What to do when a choice is left over from a move: return tokens, or pick a Location. */
function settle(state: GameState, seat: number): Move {
  let best: Move | null = null;
  let bestScore = -Infinity;
  for (const move of legalMoves(state, seat)) {
    const score = standing(applyMove(state, seat, move), seat);
    if (score > bestScore) [best, bestScore] = [move, score];
  }
  if (!best) throw new Error(`planner: no legal moves for seat ${seat} (pending=${JSON.stringify(state.pending)})`);
  return best;
}

export function planMove(state: GameState, seat: number): Move {
  if (state.pending) return settle(state, seat);

  const threats = winningCards(state, seat);
  let best: Move | null = null;
  let bestScore = -Infinity;
  for (const move of legalMoves(state, seat)) {
    const after = take(state, seat, move);
    let score = lookAhead(after, seat, DEPTH - 1);
    // Taking the card an opponent would win with is worth more than anything but winning.
    if ((move.type === "RESERVE" || move.type === "RECRUIT") && "cardId" in move && threats.has(move.cardId)) score += 200;
    if (score > bestScore) [best, bestScore] = [move, score];
  }
  if (!best) throw new Error(`planner: no legal moves for seat ${seat}`);
  return best;
}
