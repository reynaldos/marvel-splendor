/**
 * Static game data loaded from the JSON datasets.
 * The engine references cards/locations by id only; this module is the lookup.
 * Adding/removing cards is a data change — nothing here assumes deck sizes.
 */
import backlogJson from "@/data/backlog.json";
import cardsJson from "@/data/cards.json";
import locationsJson from "@/data/locations.json";
import packsJson from "@/data/packs.json";
import type { Card, CardLevel, Location, Pack } from "./types";

/** Every card there is, packs included; the collection shows all of them. */
export const ALL_CARDS: Card[] = (cardsJson as { cards: Card[] }).cards;
export const PACKS: Pack[] = (packsJson as { packs: Pack[] }).packs;
export const PACK_BY_ID: ReadonlyMap<string, Pack> = new Map(PACKS.map((p) => [p.id, p]));
const PACK_OF_CARD: ReadonlyMap<string, string> = new Map(PACKS.flatMap((p) => p.cards.map((id) => [id, p.id])));

/** The pack a card is sold in, or undefined for a base card. */
export function packOf(cardId: string): string | undefined {
  return PACK_OF_CARD.get(cardId);
}

/** The cards a game is dealt from: the base cards plus those of the packs given. */
export function cardPool(packs: readonly string[] = []): Card[] {
  return ALL_CARDS.filter((c) => {
    const pack = PACK_OF_CARD.get(c.id);
    return pack === undefined || packs.includes(pack);
  });
}
export const ALL_LOCATIONS: Location[] = (locationsJson as { locations: Location[] }).locations;
const PACK_OF_LOCATION: ReadonlyMap<string, string> = new Map(PACKS.flatMap((p) => (p.locations ?? []).map((id) => [id, p.id])));

/** The tiles a game draws from: the base tiles plus those of the packs given. */
export function locationPool(packs: readonly string[] = []): Location[] {
  return ALL_LOCATIONS.filter((l) => {
    const pack = PACK_OF_LOCATION.get(l.id);
    return pack === undefined || packs.includes(pack);
  });
}

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

export function cardsOfLevel(level: CardLevel, packs?: readonly string[]): Card[] {
  return cardPool(packs).filter((c) => c.level === level);
}
