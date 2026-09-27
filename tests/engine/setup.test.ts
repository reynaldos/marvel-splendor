import { describe, expect, it } from "vitest";
import { createGame } from "@/lib/engine/setup";
import { applyMove } from "@/lib/engine/apply";
import { validateMove } from "@/lib/engine/validate";
import { ALL_CARDS, ALL_LOCATIONS } from "@/lib/engine/data";
import { MARKET_SLOTS, TOKEN_COLORS, totalTokens } from "@/lib/engine/types";

describe("createGame", () => {
  it.each([2, 3, 4])("produces a consistent initial state for %i players", (playerCount) => {
    const state = createGame(playerCount, `seed-${playerCount}`);

    expect(state.playerCount).toBe(playerCount);
    expect(state.players).toHaveLength(playerCount);
    expect(state.status).toBe("active");
    expect(state.currentSeat).toBe(state.startingSeat);
    expect(state.startingSeat).toBeGreaterThanOrEqual(0);
    expect(state.startingSeat).toBeLessThan(playerCount);
    expect(state.pending).toBeNull();
    expect(state.endTriggered).toBe(false);

    // Token supply matches the rulebook setup table; shield is always 5.
    const expectedBasic: Record<number, number> = { 2: 4, 3: 5, 4: 7 };
    const expectedTime: Record<number, number> = { 2: 2, 3: 3, 4: 4 };
    for (const s of ["mind", "space", "soul", "power", "reality"] as const) {
      expect(state.supply[s]).toBe(expectedBasic[playerCount]);
    }
    expect(state.supply.time).toBe(expectedTime[playerCount]);
    expect(state.supply.shield).toBe(5);

    // Every player starts with nothing.
    for (const p of state.players) {
      expect(totalTokens(p.tokens)).toBe(0);
      expect(p.cards).toHaveLength(0);
      expect(p.points).toBe(0);
      expect(p.tags).toBe(0);
    }

    // Decks + market together contain every card of that level exactly once.
    for (const level of [1, 2, 3] as const) {
      expect(state.market[level]).toHaveLength(MARKET_SLOTS);
      const totalOfLevel = ALL_CARDS.filter((c) => c.level === level).length;
      const marketIds = state.market[level].filter((id): id is string => id !== null);
      expect(new Set(marketIds).size).toBe(marketIds.length); // no duplicates
      expect(marketIds).toHaveLength(MARKET_SLOTS);
      expect(state.decks[level]).toHaveLength(totalOfLevel - MARKET_SLOTS);
      const allIds = new Set([...marketIds, ...state.decks[level]]);
      expect(allIds.size).toBe(totalOfLevel);
    }

    // One location per player, all valid, distinct tiles.
    expect(state.locations).toHaveLength(playerCount);
    const validIds = new Set(ALL_LOCATIONS.map((l) => l.id));
    for (const id of state.locations) expect(validIds.has(id)).toBe(true);
    const tiles = state.locations.map((id) => ALL_LOCATIONS.find((l) => l.id === id)!.tile);
    expect(new Set(tiles).size).toBe(tiles.length);

    expect(state.avengersHolder).toBeNull();
  });

  it("is deterministic for a given seed", () => {
    const a = createGame(3, "same-seed");
    const b = createGame(3, "same-seed");
    expect(a).toEqual(b);
  });

  it("differs across seeds (sanity, not a hash guarantee)", () => {
    const a = createGame(4, "seed-a");
    const b = createGame(4, "seed-b");
    expect(a.market).not.toEqual(b.market);
  });
});

describe("token conservation invariant", () => {
  it("holds across a short scripted sequence of legal moves", () => {
    let state = createGame(2, "conservation-seed");
    const initialTotal = (s: typeof state) =>
      TOKEN_COLORS.reduce(
        (sum, c) => sum + s.supply[c] + s.players.reduce((acc, p) => acc + p.tokens[c], 0),
        0,
      );
    const before = initialTotal(state);

    for (let i = 0; i < 12 && state.status === "active"; i++) {
      const seat = state.currentSeat;
      const distinct = (["mind", "space", "soul"] as const).filter((c) => state.supply[c] >= 1);
      if (distinct.length === 0) break;
      const move = { type: "TAKE_TOKENS" as const, colors: distinct.slice(0, 3) };
      const result = validateMove(state, seat, move);
      expect(result.ok).toBe(true);
      state = applyMove(state, seat, move);
      // Resolve any RETURN_TOKENS pending with a trivial legal return.
      if (state.pending?.type === "RETURN_TOKENS") {
        const p = state.players[state.currentSeat];
        const mustReturn = state.pending.mustReturn;
        const tokens: Partial<Record<(typeof TOKEN_COLORS)[number], number>> = {};
        let remaining = mustReturn;
        for (const c of TOKEN_COLORS) {
          if (c === "time") continue;
          const take = Math.min(remaining, p.tokens[c]);
          if (take > 0) tokens[c] = take;
          remaining -= take;
          if (remaining <= 0) break;
        }
        const returnMove = { type: "RETURN_TOKENS" as const, tokens };
        expect(validateMove(state, state.currentSeat, returnMove).ok).toBe(true);
        state = applyMove(state, state.currentSeat, returnMove);
      }
    }

    expect(initialTotal(state)).toBe(before);
  });
});
