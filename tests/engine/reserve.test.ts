import { describe, expect, it } from "vitest";
import { applyMove } from "@/lib/engine/apply";
import { validateMove } from "@/lib/engine/validate";
import type { Move } from "@/lib/engine/types";
import { emptyTokens, MAX_RESERVED } from "@/lib/engine/types";
import { makePlayer, makeState } from "./helpers";

describe("RESERVE", () => {
  it("reserving from the market grants 1 shield token if any remain", () => {
    const state = makeState(2, {
      market: { 1: ["c1-01", null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
    });
    const move: Move = { type: "RESERVE", from: "market", level: 1, cardId: "c1-01" };
    expect(validateMove(state, 0, move).ok).toBe(true);
    const next = applyMove(state, 0, move);
    expect(next.players[0].reserved).toHaveLength(1);
    expect(next.players[0].reserved[0]).toEqual({ cardId: "c1-01", hidden: false });
    expect(next.players[0].tokens.shield).toBe(1);
    expect(next.supply.shield).toBe(4);
    expect(next.market[1][0]).toBeNull(); // no deck cards to refill with in this fixture
  });

  it("does not grant a shield token when the supply is exhausted", () => {
    const state = makeState(2, {
      market: { 1: ["c1-01", null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
      supply: { mind: 4, space: 4, soul: 4, power: 4, reality: 4, time: 2, shield: 0 },
    });
    const move: Move = { type: "RESERVE", from: "market", level: 1, cardId: "c1-01" };
    const next = applyMove(state, 0, move);
    expect(next.players[0].tokens.shield).toBe(0);
    expect(next.supply.shield).toBe(0);
  });

  it("reserving blind from the deck hides the card and takes its top", () => {
    const state = makeState(2, { decks: { 1: ["c1-09", "c1-10"], 2: [], 3: [] } });
    const move: Move = { type: "RESERVE", from: "deck", level: 1 };
    expect(validateMove(state, 0, move).ok).toBe(true);
    const next = applyMove(state, 0, move);
    expect(next.players[0].reserved).toEqual([{ cardId: "c1-09", hidden: true }]);
    expect(next.decks[1]).toEqual(["c1-10"]);
  });

  it("rejects reserving from an empty deck", () => {
    const state = makeState(2, { decks: { 1: [], 2: [], 3: [] } });
    const move: Move = { type: "RESERVE", from: "deck", level: 1 };
    expect(validateMove(state, 0, move).ok).toBe(false);
  });

  it("rejects reserving a card not present in the market", () => {
    const state = makeState(2);
    const move: Move = { type: "RESERVE", from: "market", level: 1, cardId: "c1-01" };
    expect(validateMove(state, 0, move).ok).toBe(false);
  });

  it(`rejects reserving beyond the ${MAX_RESERVED}-card limit`, () => {
    const state = makeState(2, {
      market: { 1: ["c1-04", null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
      players: [
        makePlayer(0, {
          reserved: [
            { cardId: "c1-01", hidden: false },
            { cardId: "c1-02", hidden: false },
            { cardId: "c1-03", hidden: true },
          ],
        }),
        makePlayer(1),
      ],
    });
    const move: Move = { type: "RESERVE", from: "market", level: 1, cardId: "c1-04" };
    expect(validateMove(state, 0, move).ok).toBe(false);
  });
});

describe("Hand limit (RETURN_TOKENS pending)", () => {
  it("triggers a RETURN_TOKENS pending when a take-tokens move pushes a player over 10", () => {
    const state = makeState(2, {
      players: [
        makePlayer(0, { tokens: { ...emptyTokens(), mind: 3, space: 3, soul: 2 } }), // 8 tokens
        makePlayer(1),
      ],
    });
    // Exactly at the limit (10): no pending, turn advances.
    const atLimit = applyMove(state, 0, { type: "TAKE_TOKENS", colors: ["power", "reality"] });
    expect(atLimit.pending).toBeNull();
    expect(atLimit.currentSeat).toBe(1);

    // One over the limit (11): pending is set and the turn does not advance.
    const overLimit = applyMove(state, 0, { type: "TAKE_TOKENS", colors: ["power", "reality", "mind"] });
    expect(overLimit.pending).toEqual({
      type: "RETURN_TOKENS",
      mustReturn: 1,
      taken: { mind: 1, power: 1, reality: 1 },
    });
    expect(overLimit.currentSeat).toBe(0); // turn hasn't advanced yet
  });

  it("only allows RETURN_TOKENS while a return is pending, for tokens actually held, down to the exact amount", () => {
    const state = makeState(2, {
      players: [makePlayer(0, { tokens: { ...emptyTokens(), mind: 5, space: 5, shield: 1 } }), makePlayer(1)],
      pending: { type: "RETURN_TOKENS", mustReturn: 1 },
    });

    // Wrong move type while pending.
    expect(validateMove(state, 0, { type: "TAKE_TOKENS", colors: ["power"] }).ok).toBe(false);

    // Returning the Time Stone is always illegal.
    expect(validateMove(state, 0, { type: "RETURN_TOKENS", tokens: { time: 1 } }).ok).toBe(false);

    // Returning more than held is illegal.
    expect(validateMove(state, 0, { type: "RETURN_TOKENS", tokens: { shield: 2 } }).ok).toBe(false);

    // Returning the wrong total is illegal.
    expect(validateMove(state, 0, { type: "RETURN_TOKENS", tokens: { mind: 2 } }).ok).toBe(false);

    // Exactly right is legal, and clears the pending / advances the turn.
    const move: Move = { type: "RETURN_TOKENS", tokens: { mind: 1 } };
    expect(validateMove(state, 0, move).ok).toBe(true);
    const next = applyMove(state, 0, move);
    expect(next.pending).toBeNull();
    expect(next.players[0].tokens.mind).toBe(4);
    expect(next.supply.mind).toBe(5);
    expect(next.currentSeat).toBe(1);
  });
});
