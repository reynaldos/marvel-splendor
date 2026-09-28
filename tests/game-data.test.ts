import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.unmock("@/data/cards.json");
vi.unmock("@/data/locations.json");

import { ALL_CARDS, ALL_LOCATIONS } from "@/lib/engine/data";
import { MARKET_SLOTS, STONES } from "@/lib/engine/types";

// Guards the real deck against the slips a hand edit makes.
describe("data/cards.json", () => {
  it("has unique ids and names", () => {
    expect(new Set(ALL_CARDS.map((c) => c.id)).size).toBe(ALL_CARDS.length);
    expect(new Set(ALL_CARDS.map((c) => c.name)).size).toBe(ALL_CARDS.length);
  });

  // The deck grows as cards are added, so sizes aren't pinned; a level only
  // needs enough cards to deal its row of the market.
  it("has enough cards at every level to fill the market", () => {
    for (const level of [1, 2, 3]) {
      expect(ALL_CARDS.filter((c) => c.level === level).length).toBeGreaterThanOrEqual(MARKET_SLOTS);
    }
  });

  it.each(ALL_CARDS)("$name is well formed", (card) => {
    expect(["hero", "villain", "both"]).toContain(card.side);
    expect([1, 2, 3]).toContain(card.level);
    expect(STONES).toContain(card.bonus);
    expect(card.points).toBeGreaterThanOrEqual(0);
    expect([0, 1, 2]).toContain(card.tags);
    const cost = Object.entries(card.cost);
    expect(cost.length).toBeGreaterThan(0);
    for (const [stone, amount] of cost) {
      expect(STONES).toContain(stone);
      expect(amount).toBeGreaterThan(0);
    }
    if (card.image?.startsWith("/")) {
      expect(existsSync(path.join(process.cwd(), "public", card.image))).toBe(true);
    }
  });
});

describe("data/locations.json", () => {
  it("has 4 double-sided tiles with unique ids and names", () => {
    expect(new Set(ALL_LOCATIONS.map((l) => l.id)).size).toBe(ALL_LOCATIONS.length);
    expect(new Set(ALL_LOCATIONS.map((l) => l.name)).size).toBe(ALL_LOCATIONS.length);
    for (const tile of [1, 2, 3, 4]) {
      expect(ALL_LOCATIONS.filter((l) => l.tile === tile).map((l) => l.side).sort()).toEqual(["a", "b"]);
    }
  });

  it.each(ALL_LOCATIONS)("$name is well formed", (location) => {
    expect(location.points).toBeGreaterThan(0);
    const requires = Object.entries(location.requires);
    expect(requires.length).toBeGreaterThan(0);
    for (const [stone, amount] of requires) {
      expect(STONES).toContain(stone);
      expect(amount).toBeGreaterThan(0);
    }
    if (location.image?.startsWith("/")) {
      expect(existsSync(path.join(process.cwd(), "public", location.image))).toBe(true);
    }
  });
});
