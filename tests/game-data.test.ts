import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.unmock("@/data/cards.json");
vi.unmock("@/data/locations.json");
vi.unmock("@/data/packs.json");

import { ALL_CARDS, ALL_LOCATIONS, CARD_BY_ID, cardPool, PACKS, packOf } from "@/lib/engine/data";
import { applyMove } from "@/lib/engine/apply";
import { createGame } from "@/lib/engine/setup";
import { DEFAULT_SETTINGS, MARKET_SLOTS, STONES, type Move } from "@/lib/engine/types";
import { replaySteps } from "@/lib/game-replay";
import { chooseBotMove } from "@/lib/bot/policy";

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
    expect(Array.isArray(card.groups)).toBe(true);
    expect(card.groups.length).toBeLessThanOrEqual(4);
    expect(new Set(card.groups).size).toBe(card.groups.length);
    for (const group of card.groups) expect(group.trim()).toBe(group);
    expect(card.groups).not.toContain("");
    // The Avengers row is for cards that bear the badge; the rest have teams of their own.
    if (card.groups.includes("Avengers")) expect(card.tags).toBeGreaterThan(0);
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

describe("data/packs.json", () => {
  it("has unique ids, and every card in one pack at most", () => {
    expect(new Set(PACKS.map((p) => p.id)).size).toBe(PACKS.length);
    const sold = PACKS.flatMap((p) => p.cards);
    expect(new Set(sold).size).toBe(sold.length);
  });

  it.each(PACKS)("$title is well formed", (pack) => {
    expect(pack.title.trim()).toBe(pack.title);
    expect(pack.description.length).toBeGreaterThan(0);
    expect(pack.cover).toMatch(/^\/assets\/packs\//);
    expect(pack.cost).toBeGreaterThan(0);
    expect(pack.cards.length).toBeGreaterThan(0);
    for (const id of pack.cards) expect(CARD_BY_ID.get(id)?.id).toBe(id);
    expect(new Date(pack.releasedAt).getTime()).not.toBeNaN();
  });

  it("deals a pack's cards only to a game that has it", () => {
    for (const pack of PACKS) {
      const without = createGame(2, "pool", {});
      const withPack = createGame(2, "pool", { packs: [pack.id] });
      const dealt = (state: typeof without) => new Set([1, 2, 3].flatMap((l) => [...state.decks[l as 1 | 2 | 3], ...state.market[l as 1 | 2 | 3]]));
      for (const id of pack.cards) {
        expect(packOf(id)).toBe(pack.id);
        expect(dealt(without).has(id)).toBe(false);
        expect(dealt(withPack).has(id)).toBe(true);
      }
      expect(cardPool([pack.id]).length).toBe(cardPool().length + pack.cards.length);
    }
  });

  it("re-deals a game's packs from its saved settings on replay", () => {
    const packed = { ...DEFAULT_SETTINGS, packs: PACKS.map((p) => p.id) };
    let state = createGame(3, "replay-p", packed);
    const moves: Array<{ seat: number; move: Move }> = [];
    while (moves.length < 12) {
      const seat = state.currentSeat;
      const move = chooseBotMove(state, seat);
      state = applyMove(state, seat, move);
      moves.push({ seat, move });
    }
    const args = { seed: "replay-p", playerCount: 3, moves, since: 0, viewerSeat: 0, finalState: state };
    expect(replaySteps({ ...args, settings: packed })).toHaveLength(12);
    // The same seed without the packs is a different deal, which must not be trusted.
    expect(replaySteps({ ...args, settings: DEFAULT_SETTINGS })).toBeNull();
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
