/**
 * The Duel cards and Royals, loaded once from data/duel and looked up by id. Two card sets: the box's 67, which
 * older games were dealt from, and one card for every Marvel card, which new games deal from the game's pool.
 */
import cardsJson from "@/data/duel/cards.json";
import marvelCardsJson from "@/data/duel/marvel-cards.json";
import royalsJson from "@/data/duel/royals.json";
import { cardPool } from "@/lib/engine/data";

import type { CardLevel, DuelCard, RoyalCard } from "./types";

/** The box's cards. */
export const DUEL_CARDS: DuelCard[] = (cardsJson as { cards: DuelCard[] }).cards;
/** A Duel card for every Marvel card, by the Marvel card's id; made by scripts/duel-cards.ts. */
export const MARVEL_DUEL_CARDS: DuelCard[] = (marvelCardsJson as { cards: DuelCard[] }).cards;
export const ROYAL_CARDS: RoyalCard[] = (royalsJson as { royals: RoyalCard[] }).royals;
const CARD_BY_ID = new Map([...DUEL_CARDS, ...MARVEL_DUEL_CARDS].map((c) => [c.id, c]));
const ROYAL_BY_ID = new Map(ROYAL_CARDS.map((r) => [r.id, r]));

export function getDuelCard(id: string): DuelCard {
  const card = CARD_BY_ID.get(id);
  if (!card) throw new Error(`Unknown Duel card id: ${id}`);
  return card;
}

export function getRoyal(id: string): RoyalCard {
  const royal = ROYAL_BY_ID.get(id);
  if (!royal) throw new Error(`Unknown Royal card id: ${id}`);
  return royal;
}

/** The cards of a level a game deals: the box's, or the Marvel set from the base cards and the packs given. */
export function duelCardsOfLevel(level: CardLevel, set?: "marvel", packs: readonly string[] = []): DuelCard[] {
  if (set !== "marvel") return DUEL_CARDS.filter((c) => c.level === level);
  const pool = new Set(cardPool(packs).map((c) => c.id));
  return MARVEL_DUEL_CARDS.filter((c) => c.level === level && pool.has(c.id));
}
