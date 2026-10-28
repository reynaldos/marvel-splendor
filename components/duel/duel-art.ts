/**
 * How Duel's pieces look in this game. A card of the Marvel set is a Marvel
 * card and wears its own picture. The box's cards have no art of their own:
 * each wears a Marvel picture of its level and color, chosen once, the same
 * for every player and every game. The powers have an icon each until there
 * is art for them.
 */
import { Coins, HandCoins, PlayingCard, Repeat, ScrollText, type LucideIcon } from "lucide-react";

import { DUEL_CARDS, getDuelCard } from "@/lib/duel/data";
import type { Ability, DuelCard, OwnedCard, RoyalTiles } from "@/lib/duel/types";
import { ALL_CARDS, ALL_LOCATIONS, CARD_BY_ID, LOCATION_BY_ID } from "@/lib/engine/data";
import { createRng, shuffle } from "@/lib/engine/rng";
import { STONES, type Card } from "@/lib/engine/types";

export const ABILITIES: Record<Ability, { icon: LucideIcon; label: string }> = {
  again: { icon: Repeat, label: "Take another turn" },
  wild: { icon: PlayingCard, label: "Wild: joins a color you own" },
  token: { icon: Coins, label: "Take a stone of this color" },
  privilege: { icon: ScrollText, label: "Take a Privilege" },
  steal: { icon: HandCoins, label: "Take a stone from your opponent" },
};

/**
 * A picture for each Duel card: same level, same color, and Avengers badges only on a badged card, so only an
 * Avenger ever wears one. Then no more printed costs than the card has, so the cost column covers them; that
 * gives way when nothing fits. Dealt once from a fixed seed over the cards in id order; a picture is shared only
 * when nothing else fits.
 */
let dealt: Map<string, Card> | null = null;

/** The pictures, dealt on first use so a game of the Marvel cards alone never deals them. */
function art(): Map<string, Card> {
  if (dealt) return dealt;
  const rng = createRng("duel-art");
  const pictured = ALL_CARDS.filter((c) => c.image);
  const printedCosts = (c: Card) => STONES.filter((s) => (c.cost[s] ?? 0) > 0).length;
  const used = new Set<string>();
  const out = new Map<string, Card>();
  const pick = (card: DuelCard, free: boolean, anyCosts: boolean) => {
    const fits = pictured.filter(
      (c) =>
        c.level === card.level &&
        (free || !used.has(c.id)) &&
        (card.bonus === "wild" || card.bonus === null || c.bonus === card.bonus) &&
        c.tags > 0 === card.crowns > 0 &&
        (anyCosts || printedCosts(c) <= Object.keys(card.cost).length),
    );
    return shuffle(fits, rng)[0];
  };
  for (const card of DUEL_CARDS) {
    const picture = pick(card, false, false) ?? pick(card, false, true) ?? pick(card, true, false) ?? pick(card, true, true) ?? pictured.find((c) => c.level === card.level) ?? ALL_CARDS[0];
    used.add(picture.id);
    out.set(card.id, picture);
  }
  dealt = out;
  return out;
}

/** The Marvel picture a Duel card wears: its own for a card of the Marvel set. */
export function duelArt(cardId: string): Card {
  return CARD_BY_ID.get(cardId) ?? art().get(cardId) ?? art().get(getDuelCard(cardId).id)!;
}

/** The Marvel card ids behind a player's Duel cards, for the team view. */
export function artIdsOf(cards: readonly OwnedCard[]): string[] {
  return cards.map((c) => duelArt(c.cardId).id);
}

type Pictured = (typeof ALL_LOCATIONS)[number] & { image: string };
/** Four Location tiles with art stand in for the Royal cards' pictures on older games, which dealt none of their own. */
export const ROYAL_TILES = ALL_LOCATIONS.filter((l): l is Pictured => Boolean(l.image)).slice(4, 8);

/** The Location a Royal card goes by: the one the game dealt it, else one of the fixed four. */
export function royalTile(royalId: string, tiles?: RoyalTiles): Pictured {
  const dealt = tiles?.[royalId] ? LOCATION_BY_ID.get(tiles[royalId]) : undefined;
  if (dealt?.image) return dealt as Pictured;
  return ROYAL_TILES[Number(royalId.split("-")[1]) - 1] ?? ROYAL_TILES[0];
}
