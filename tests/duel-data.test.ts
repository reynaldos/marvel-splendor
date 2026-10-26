import { describe, expect, it } from "vitest";

import cardsJson from "@/data/duel/cards.json";
import royalsJson from "@/data/duel/royals.json";

const cards = cardsJson.cards;

// The box: 67 Jewel cards, 30/24/13 by level, and 4 Royal cards. A slip in a hand edit shows here.
describe("data/duel", () => {
  it("has the box's 67 cards, 30/24/13 by level, with unique ids", () => {
    expect(cards).toHaveLength(67);
    expect([1, 2, 3].map((l) => cards.filter((c) => c.level === l).length)).toEqual([30, 24, 13]);
    expect(new Set(cards.map((c) => c.id)).size).toBe(67);
  });

  it("has the special cards: 9 with the many-gem bonus, 3 with none, 5 with a double bonus", () => {
    expect(cards.filter((c) => c.bonus === "wild").length).toBe(9);
    expect(cards.filter((c) => c.bonus === null).length).toBe(3);
    expect(cards.filter((c) => c.bonusCount === 2).length).toBe(5);
    // Only a many-gem card can carry the join-a-colour power.
    expect(cards.filter((c) => c.ability === "wild").every((c) => c.bonus === "wild")).toBe(true);
    expect(cards.filter((c) => c.bonus === null).every((c) => c.bonusCount === 0)).toBe(true);
  });

  it("prices in all six tokens, Pearls included, and never above the top-level costs", () => {
    expect(cards.filter((c) => "time" in c.cost).length).toBeGreaterThan(20);
    for (const c of cards) for (const n of Object.values(c.cost)) expect(n).toBeGreaterThanOrEqual(1);
    expect(Math.max(...cards.flatMap((c) => Object.values(c.cost)))).toBe(8);
  });

  it("has 4 Royal cards worth 9 points together", () => {
    expect(royalsJson.royals).toHaveLength(4);
    expect(royalsJson.royals.reduce((sum, r) => sum + r.points, 0)).toBe(9);
  });
});
