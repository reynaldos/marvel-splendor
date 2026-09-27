import { describe, expect, it } from "vitest";
import { applyMove } from "@/lib/engine/apply";
import { getCard } from "@/lib/engine/data";
import type { Move } from "@/lib/engine/types";
import { AVENGERS_TILE_POINTS, emptyTokens } from "@/lib/engine/types";
import { makePlayer, makeState } from "./helpers";

// c1-08: level 1, cost { space: 4 }, bonus power, points 1, tags 1
// c3-04: level 3, cost { reality: 7, power: 3 }, bonus power, points 5, tags 2
describe("Avengers Assemble tile", () => {
  it("is claimed by the first player to reach 3 tags", () => {
    const card = getCard("c1-08"); // tags: 1
    const state = makeState(2, {
      market: { 1: [card.id, null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
      players: [
        makePlayer(0, { tags: 2, tokens: { ...emptyTokens(), space: 4 } }),
        makePlayer(1),
      ],
    });
    const move: Move = { type: "RECRUIT", from: "market", cardId: card.id };
    const next = applyMove(state, 0, move);
    expect(next.players[0].tags).toBe(3);
    expect(next.avengersHolder).toBe(0);
    expect(next.players[0].points).toBe(card.points + AVENGERS_TILE_POINTS);
  });

  it("does not claim the tile below the 3-tag threshold", () => {
    const card = getCard("c1-08"); // tags: 1
    const state = makeState(2, {
      market: { 1: [card.id, null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
      players: [
        makePlayer(0, { tags: 1, tokens: { ...emptyTokens(), space: 4 } }),
        makePlayer(1),
      ],
    });
    const move: Move = { type: "RECRUIT", from: "market", cardId: card.id };
    const next = applyMove(state, 0, move);
    expect(next.players[0].tags).toBe(2);
    expect(next.avengersHolder).toBeNull();
  });

  it("is stolen by a player whose tags strictly exceed the current holder's", () => {
    const card = getCard("c3-04"); // tags: 2
    const state = makeState(2, {
      avengersHolder: 1,
      market: { 1: [null, null, null, null], 2: [null, null, null, null], 3: [card.id, null, null, null] },
      players: [
        makePlayer(0, { tags: 2, tokens: { ...emptyTokens(), reality: 7, power: 3 } }),
        makePlayer(1, { tags: 3, points: AVENGERS_TILE_POINTS }),
      ],
    });
    const move: Move = { type: "RECRUIT", from: "market", cardId: card.id };
    const next = applyMove(state, 0, move);
    expect(next.players[0].tags).toBe(4);
    expect(next.avengersHolder).toBe(0);
    expect(next.players[1].points).toBe(0); // lost the tile's points
    expect(next.players[0].points).toBe(card.points + AVENGERS_TILE_POINTS);
  });

  it("is not stolen on a mere tie with the current holder's tags", () => {
    const card = getCard("c1-08"); // tags: 1
    const state = makeState(2, {
      avengersHolder: 1,
      market: { 1: [card.id, null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
      players: [
        makePlayer(0, { tags: 2, tokens: { ...emptyTokens(), space: 4 } }),
        makePlayer(1, { tags: 3, points: AVENGERS_TILE_POINTS }),
      ],
    });
    const move: Move = { type: "RECRUIT", from: "market", cardId: card.id };
    const next = applyMove(state, 0, move);
    expect(next.players[0].tags).toBe(3);
    expect(next.avengersHolder).toBe(1); // unchanged: 3 does not exceed 3
    expect(next.players[1].points).toBe(AVENGERS_TILE_POINTS); // still holds it
  });
});
