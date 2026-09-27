import { describe, expect, it } from "vitest";
import { applyMove } from "@/lib/engine/apply";
import { validateMove } from "@/lib/engine/validate";
import { getCard } from "@/lib/engine/data";
import type { Move } from "@/lib/engine/types";
import { emptyStones, emptyTokens } from "@/lib/engine/types";
import { makePlayer, makeState } from "./helpers";

// c1-01: cost {mind:1, space:1, soul:1, reality:1}, bonus power, points 0, tags 0
// c1-07: cost {soul:3}, bonus power, points 0, tags 0
// c3-01: cost {mind:3, space:3, soul:5, reality:3}, level 3, bonus power, points 3
describe("RECRUIT affordability", () => {
  it("recruits a card paying exact matching tokens, no bonuses/shield needed", () => {
    const card = getCard("c1-01");
    const state = makeState(2, {
      market: { 1: [card.id, null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
      players: [
        makePlayer(0, { tokens: { ...emptyTokens(), mind: 1, space: 1, soul: 1, reality: 1 } }),
        makePlayer(1),
      ],
    });
    const move: Move = { type: "RECRUIT", from: "market", cardId: card.id };
    expect(validateMove(state, 0, move).ok).toBe(true);
    const next = applyMove(state, 0, move);
    const p0 = next.players[0];
    expect(p0.cards).toContain(card.id);
    expect(p0.bonuses.power).toBe(1);
    expect(p0.points).toBe(card.points);
    expect(p0.tokens.mind).toBe(0);
    expect(p0.tokens.space).toBe(0);
    expect(next.supply.mind).toBeGreaterThan(0); // spent tokens return to supply
  });

  it("discounts cost by owned bonuses of matching color", () => {
    const card = getCard("c1-07"); // cost { soul: 3 }
    const state = makeState(2, {
      market: { 1: [card.id, null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
      players: [
        makePlayer(0, {
          bonuses: { ...emptyStones(), soul: 2 }, // need drops from 3 to 1
          tokens: { ...emptyTokens(), soul: 1 },
        }),
        makePlayer(1),
      ],
    });
    const move: Move = { type: "RECRUIT", from: "market", cardId: card.id };
    expect(validateMove(state, 0, move).ok).toBe(true);
    const next = applyMove(state, 0, move);
    expect(next.players[0].tokens.soul).toBe(0);
    expect(next.players[0].bonuses.soul).toBe(2); // unchanged: this card's bonus is `power`
    expect(next.players[0].bonuses.power).toBe(1);
  });

  it("covers any shortfall with shield (wildcard) tokens", () => {
    const card = getCard("c1-07"); // cost { soul: 3 }
    const state = makeState(2, {
      market: { 1: [card.id, null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
      players: [
        makePlayer(0, {
          bonuses: { ...emptyStones(), soul: 1 }, // need drops from 3 to 2
          tokens: { ...emptyTokens(), soul: 1, shield: 1 },
        }),
        makePlayer(1),
      ],
    });
    const move: Move = { type: "RECRUIT", from: "market", cardId: card.id };
    expect(validateMove(state, 0, move).ok).toBe(true);
    const next = applyMove(state, 0, move);
    expect(next.players[0].tokens.soul).toBe(0);
    expect(next.players[0].tokens.shield).toBe(0);
    expect(next.supply.shield).toBeGreaterThan(0);
  });

  it("rejects recruiting a card the player cannot afford", () => {
    const card = getCard("c1-07"); // cost { soul: 3 }
    const state = makeState(2, {
      market: { 1: [card.id, null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
      players: [makePlayer(0, { tokens: { ...emptyTokens(), soul: 1 } }), makePlayer(1)],
    });
    const move: Move = { type: "RECRUIT", from: "market", cardId: card.id };
    expect(validateMove(state, 0, move).ok).toBe(false);
  });

  it("rejects recruiting from market a card that isn't actually there", () => {
    const state = makeState(2);
    const move: Move = { type: "RECRUIT", from: "market", cardId: "c1-01" };
    expect(validateMove(state, 0, move).ok).toBe(false);
  });

  it("rejects recruiting from reserve a card the player hasn't reserved", () => {
    const state = makeState(2);
    const move: Move = { type: "RECRUIT", from: "reserve", cardId: "c1-01" };
    expect(validateMove(state, 0, move).ok).toBe(false);
  });

  it("refills the market slot from the deck after a market recruit", () => {
    const card = getCard("c1-01");
    const state = makeState(2, {
      market: { 1: [card.id, null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
      decks: { 1: ["c1-02"], 2: [], 3: [] },
      players: [
        makePlayer(0, { tokens: { ...emptyTokens(), mind: 1, space: 1, soul: 1, reality: 1 } }),
        makePlayer(1),
      ],
    });
    const move: Move = { type: "RECRUIT", from: "market", cardId: card.id };
    const next = applyMove(state, 0, move);
    expect(next.market[1][0]).toBe("c1-02");
    expect(next.decks[1]).toHaveLength(0);
  });
});

describe("Time Stone grant", () => {
  it("grants exactly 1 time token the first time a player recruits a Level 3 card", () => {
    const card = getCard("c3-01"); // level 3, cost mind3/space3/soul5/reality3
    const state = makeState(2, {
      market: { 1: [null, null, null, null], 2: [null, null, null, null], 3: [card.id, null, null, null] },
      players: [
        makePlayer(0, { tokens: { ...emptyTokens(), mind: 3, space: 3, soul: 5, reality: 3 } }),
        makePlayer(1),
      ],
    });
    expect(state.supply.time).toBe(2);
    const move: Move = { type: "RECRUIT", from: "market", cardId: card.id };
    const next = applyMove(state, 0, move);
    expect(next.players[0].tokens.time).toBe(1);
    expect(next.supply.time).toBe(1);
  });

  it("does not grant a second time token on a later Level 3 recruit", () => {
    const cardA = getCard("c3-01");
    const cardB = getCard("c3-05");
    const state = makeState(2, {
      market: { 1: [null, null, null, null], 2: [null, null, null, null], 3: [cardA.id, cardB.id, null, null] },
      players: [
        makePlayer(0, {
          tokens: { ...emptyTokens(), mind: 6, space: 6, soul: 8, power: 5, reality: 6 },
          bonuses: emptyStones(),
        }),
        makePlayer(1),
      ],
    });
    const first = applyMove(state, 0, { type: "RECRUIT", from: "market", cardId: cardA.id });
    expect(first.players[0].tokens.time).toBe(1);
    expect(first.supply.time).toBe(1);
    // It's player 1's turn now; hand it back to player 0 by directly forcing currentSeat for this unit test.
    const secondTurn = { ...first, currentSeat: 0 };
    const second = applyMove(secondTurn, 0, { type: "RECRUIT", from: "market", cardId: cardB.id });
    expect(second.players[0].tokens.time).toBe(1); // unchanged
    expect(second.supply.time).toBe(1); // unchanged
  });
});
