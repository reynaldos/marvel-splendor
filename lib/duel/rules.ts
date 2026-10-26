/** Small pure rules shared by validate, legal-moves, apply and the bot: bonuses, costs, crowns, points, the wins. */
import { getDuelCard, getRoyal } from "./data";
import {
  GOLD,
  PEARL,
  STONES,
  TOKEN_COLORS,
  WIN_COLOR_POINTS,
  WIN_CROWNS,
  WIN_POINTS,
  type DuelCard,
  type DuelPlayer,
  type Stone,
  type StoneCounts,
  type TokenColor,
  type TokenCounts,
} from "./types";

/** A sum per color over a player's cards, a wild card counting as the color it joined. */
function byColor(player: DuelPlayer, pick: (card: DuelCard) => number): StoneCounts {
  const out: StoneCounts = { mind: 0, space: 0, soul: 0, power: 0, reality: 0 };
  for (const owned of player.cards) {
    const card = getDuelCard(owned.cardId);
    const color = card.bonus === "wild" ? owned.joined : card.bonus;
    if (color) out[color] += pick(card);
  }
  return out;
}

/** A player's bonuses by stone. */
export const bonusesOf = (player: DuelPlayer): StoneCounts => byColor(player, (c) => c.bonusCount);

/** Points on cards of each color. */
export const colorPointsOf = (player: DuelPlayer): StoneCounts => byColor(player, (c) => c.points);

export function crownsOf(player: DuelPlayer): number {
  return player.cards.reduce((sum, c) => sum + getDuelCard(c.cardId).crowns, 0);
}

/** Points on owned cards and Royals; reserved cards count for nothing. */
export function pointsOf(player: DuelPlayer): number {
  return (
    player.cards.reduce((sum, c) => sum + getDuelCard(c.cardId).points, 0) +
    player.royals.reduce((sum, id) => sum + getRoyal(id).points, 0)
  );
}

/** Whether the player has won: 20 points, 10 crowns, or 10 points on one color. */
export function hasWon(player: DuelPlayer): boolean {
  return (
    pointsOf(player) >= WIN_POINTS ||
    crownsOf(player) >= WIN_CROWNS ||
    STONES.some((s) => colorPointsOf(player)[s] >= WIN_COLOR_POINTS)
  );
}

/**
 * What a card costs this player: each token's cost less the matching bonus, and how much Gold must cover
 * what their tokens do not. Pearls have no bonus. Payable when the Gold needed is at most the Gold held.
 */
export function buyCost(cardId: string, player: DuelPlayer): { pay: Partial<TokenCounts>; goldNeeded: number } {
  const card = getDuelCard(cardId);
  const bonuses = bonusesOf(player);
  const pay: Partial<TokenCounts> = {};
  let goldNeeded = 0;
  for (const t of TOKEN_COLORS) {
    if (t === GOLD) continue;
    const raw = card.cost[t] ?? 0;
    const need = Math.max(0, raw - (t === PEARL ? 0 : bonuses[t as Stone]));
    if (need === 0) continue;
    const fromTokens = Math.min(need, player.tokens[t]);
    if (fromTokens > 0) pay[t] = fromTokens;
    goldNeeded += need - fromTokens;
  }
  if (goldNeeded > 0) pay[GOLD] = goldNeeded;
  return { pay, goldNeeded };
}

/** Whether the player can pay for the card; a wild card also needs a color to join, see `joinableColors`. */
export function canBuy(cardId: string, player: DuelPlayer): boolean {
  if (getDuelCard(cardId).bonus === "wild" && joinableColors(player).length === 0) return false;
  return buyCost(cardId, player).goldNeeded <= player.tokens[GOLD];
}

/** The colors a wild card may join: those the player owns a card of. */
export function joinableColors(player: DuelPlayer): Stone[] {
  const bonuses = bonusesOf(player);
  return STONES.filter((s) => bonuses[s] > 0);
}

/** Whether a line of tokens hands the opponent a Privilege: three of one color, or two Pearls. */
export function lineOwesPrivilege(tokens: readonly TokenColor[]): boolean {
  const pearls = tokens.filter((t) => t === PEARL).length;
  if (pearls >= 2) return true;
  return STONES.some((s) => tokens.filter((t) => t === s).length >= 3);
}
