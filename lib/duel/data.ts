/** The Duel cards and Royals, loaded once from data/duel and looked up by id. */
import cardsJson from "@/data/duel/cards.json";
import royalsJson from "@/data/duel/royals.json";

import type { CardLevel, DuelCard, RoyalCard } from "./types";

export const DUEL_CARDS: DuelCard[] = (cardsJson as { cards: DuelCard[] }).cards;
export const ROYAL_CARDS: RoyalCard[] = (royalsJson as { royals: RoyalCard[] }).royals;
const CARD_BY_ID = new Map(DUEL_CARDS.map((c) => [c.id, c]));
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

export function duelCardsOfLevel(level: CardLevel): DuelCard[] {
  return DUEL_CARDS.filter((c) => c.level === level);
}
