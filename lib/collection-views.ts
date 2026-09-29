import type { Card } from "@/lib/engine/types";

export const COLLECTION_VIEWS = ["grid", "level", "group", "alliance"] as const;
export type CollectionView = (typeof COLLECTION_VIEWS)[number];

export interface CollectionRow {
  /** Null for the grid, which is one row with no name. */
  name: string | null;
  cards: Card[];
}

const LEVELS = { 1: "Level I", 2: "Level II", 3: "Level III" };
const ALLIANCES = { hero: "Heroes", villain: "Villains", both: "Either side" };
/** How many cards a team needs before it gets a row of its own. */
export const GROUP_MIN = 3;
const OTHERS = "Others";

/** The cards in the order they are shown: by level, then by name. */
export function inOrder(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

/**
 * A row for every team with enough cards, the biggest first, and the rest
 * under Others. The teams are read off the cards, so marking cards with a new
 * team makes its row. A card in two teams is in both rows.
 */
function byGroup(cards: Card[]): CollectionRow[] {
  const teams = new Map<string, Card[]>();
  for (const card of cards) {
    for (const team of card.groups) teams.set(team, [...(teams.get(team) ?? []), card]);
  }
  const rows = [...teams]
    .filter(([, members]) => members.length >= GROUP_MIN)
    .sort(([a, x], [b, y]) => y.length - x.length || a.localeCompare(b))
    .map(([name, members]) => ({ name, cards: members }));
  const shown = new Set(rows.map((row) => row.name));
  const others = cards.filter((card) => !card.groups.some((team) => shown.has(team)));
  return others.length > 0 ? [...rows, { name: OTHERS, cards: others }] : rows;
}

/** The cards split into named rows for a view. */
export function collectionRows(cards: Card[], view: CollectionView): CollectionRow[] {
  const sorted = inOrder(cards);
  if (view === "grid") return [{ name: null, cards: sorted }];
  if (view === "group") return byGroup(sorted);
  const names: Record<string, string> = view === "level" ? LEVELS : ALLIANCES;
  return Object.entries(names)
    .map(([key, name]) => ({ name, cards: sorted.filter((c) => String(view === "level" ? c.level : c.side) === key) }))
    .filter((row) => row.cards.length > 0);
}
