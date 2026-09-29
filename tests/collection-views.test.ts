import { describe, expect, it } from "vitest";

import { collectionRows, inOrder } from "@/lib/collection-views";
import type { Card } from "@/lib/engine/types";

const card = (id: string, name: string, level: 1 | 2 | 3, side: Card["side"], groups: string[] = []): Card =>
  ({ id, name, side, groups, level, bonus: "mind", points: 0, cost: {}, tags: 0 });
const cards = [
  card("a", "Thor", 3, "hero", ["Avengers", "Asgard"]),
  card("b", "Loki", 3, "villain", ["Asgard"]),
  card("c", "Venom", 2, "both", ["Symbiotes"]),
  card("d", "Wasp", 1, "hero", ["Avengers"]),
  card("e", "Hulk", 3, "hero", ["Avengers"]),
  card("f", "Punisher", 2, "both"),
];

describe("the collection's views", () => {
  const rows = (view: Parameters<typeof collectionRows>[1], from = cards) =>
    collectionRows(from, view).map((r) => [r.name, r.cards.map((c) => c.name)]);

  it("orders cards by level, then by name", () => {
    expect(inOrder(cards).map((c) => c.name)).toEqual(["Wasp", "Punisher", "Venom", "Hulk", "Loki", "Thor"]);
  });
  it("shows the grid as one row with no name, holding every card", () => {
    expect(collectionRows(cards, "grid")).toEqual([{ name: null, cards: inOrder(cards) }]);
  });
  it("splits by level and by alliance, each card in exactly one row", () => {
    expect(rows("level").map((r) => r[0])).toEqual(["Level I", "Level II", "Level III"]);
    expect(rows("alliance")).toEqual([
      ["Heroes", ["Wasp", "Hulk", "Thor"]],
      ["Villains", ["Loki"]],
      ["Either side", ["Punisher", "Venom"]],
    ]);
    for (const view of ["grid", "level", "alliance"] as const) {
      expect(collectionRows(cards, view).flatMap((r) => r.cards.map((c) => c.id)).sort()).toEqual(["a", "b", "c", "d", "e", "f"]);
    }
  });

  it("gives a team of three or more a row, and puts the rest under Others", () => {
    expect(rows("group")).toEqual([
      ["Avengers", ["Wasp", "Hulk", "Thor"]],
      // Loki's team is too small, Venom's too, and the Punisher has none. Thor is shown already.
      ["Others", ["Punisher", "Venom", "Loki"]],
    ]);
  });
  it("makes a new team's row by itself once it has three cards", () => {
    const xMen = [card("x1", "Storm", 2, "hero", ["X-Men"]), card("x2", "Beast", 1, "hero", ["X-Men"])];
    expect(rows("group", [...cards, ...xMen]).map((r) => r[0])).toEqual(["Avengers", "Others"]);
    const three = [...cards, ...xMen, card("x3", "Rogue", 3, "hero", ["X-Men"])];
    expect(rows("group", three)).toContainEqual(["X-Men", ["Beast", "Storm", "Rogue"]]);
    expect(rows("group", three).at(-1)![1]).not.toContain("Storm");
  });
  it("shows a card in every team of its own that has a row", () => {
    const asgard = [...cards, card("g", "Hela", 2, "villain", ["Asgard"])];
    const shown = rows("group", asgard);
    expect(shown.map((r) => r[0])).toEqual(["Asgard", "Avengers", "Others"]);
    expect(shown.filter((r) => (r[1] as string[]).includes("Thor")).map((r) => r[0])).toEqual(["Asgard", "Avengers"]);
  });
  it("leaves nobody out of the group view", () => {
    const shown = new Set(collectionRows(cards, "group").flatMap((r) => r.cards.map((c) => c.id)));
    expect([...shown].sort()).toEqual(["a", "b", "c", "d", "e", "f"]);
  });
  it("puts the bigger team first", () => {
    const big = [...cards, card("g", "Hela", 2, "villain", ["Asgard"]), card("h", "Falcon", 2, "hero", ["Avengers"])];
    expect(rows("group", big).map((r) => r[0])).toEqual(["Avengers", "Asgard", "Others"]);
  });
});
