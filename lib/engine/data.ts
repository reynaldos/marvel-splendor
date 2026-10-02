/**
 * Static game data loaded from the JSON datasets.
 * The engine references cards/locations by id only; this module is the lookup.
 * Adding/removing cards is a data change — nothing here assumes deck sizes.
 */
import backlogJson from "@/data/backlog.json";
import cardsJson from "@/data/cards.json";
import locationsJson from "@/data/locations.json";
import type { Card, CardLevel, Location } from "./types";

export const ALL_CARDS: Card[] = (cardsJson as { cards: Card[] }).cards;
export const ALL_LOCATIONS: Location[] = (locationsJson as { locations: Location[] }).locations;

// A card pulled back into the backlog keeps its id, so games that hold it still resolve.
const BACKLOG_CARDS = (backlogJson as { cards: Partial<Card>[] }).cards.filter((c): c is Card => Boolean(c.id));

export const CARD_BY_ID: ReadonlyMap<string, Card> = new Map([...ALL_CARDS, ...BACKLOG_CARDS].map((c) => [c.id, c]));
export const LOCATION_BY_ID: ReadonlyMap<string, Location> = new Map(
  ALL_LOCATIONS.map((l) => [l.id, l]),
);

export function getCard(id: string): Card {
  const card = CARD_BY_ID.get(id);
  if (!card) throw new Error(`Unknown card id: ${id}`);
  return card;
}

export function getLocation(id: string): Location {
  const loc = LOCATION_BY_ID.get(id);
  if (!loc) throw new Error(`Unknown location id: ${id}`);
  return loc;
}

export function cardsOfLevel(level: CardLevel): Card[] {
  return ALL_CARDS.filter((c) => c.level === level);
}
