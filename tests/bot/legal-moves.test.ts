import { describe, expect, it } from "vitest";
import { legalMoves } from "@/lib/engine/legal-moves";
import { validateMove } from "@/lib/engine/validate";
import { getCard } from "@/lib/engine/data";
import { emptyStones, emptyTokens, MAX_RESERVED, type Move } from "@/lib/engine/types";
import { makePlayer, makeState } from "../engine/helpers";

/** Every move legalMoves() returns must independently pass validateMove. */
function expectAllValid(state: Parameters<typeof legalMoves>[0], seat: number, moves: Move[]) {
  for (const move of moves) {
    const result = validateMove(state, seat, move);
    expect(result.ok, `expected ${JSON.stringify(move)} to validate: ${JSON.stringify(result)}`).toBe(true);
  }
}

describe("legalMoves — TAKE_TOKENS combinatorics", () => {
  it("with full supply: C(5,3) + C(5,2) + C(5,1) + 5 (2-same) = 30 combos", () => {
    const state = makeState(2); // makeState's default supply is 4 of each basic — exactly at the 2-same threshold.
    const moves = legalMoves(state, 0).filter((m) => m.type === "TAKE_TOKENS");
    expect(moves.length).toBe(10 + 10 + 5 + 5);
    expectAllValid(state, 0, moves);
  });

  it("excludes a color from every combo once its supply hits 0", () => {
    const state = makeState(2, {
      supply: { mind: 0, space: 4, soul: 4, power: 4, reality: 4, time: 2, shield: 5 },
    });
    const moves = legalMoves(state, 0).filter((m) => m.type === "TAKE_TOKENS");
    for (const m of moves) {
      if (m.type === "TAKE_TOKENS") expect(m.colors).not.toContain("mind");
    }
    // Remaining 4 stones: C(4,3)+C(4,2)+C(4,1) + 4 (2-same) = 4+6+4+4 = 18
    expect(moves.length).toBe(4 + 6 + 4 + 4);
    expectAllValid(state, 0, moves);
  });

  it("excludes only the 2-same option for a color below 4, keeps it in distinct combos", () => {
    const state = makeState(2, {
      supply: { mind: 3, space: 4, soul: 4, power: 4, reality: 4, time: 2, shield: 5 },
    });
    const moves = legalMoves(state, 0).filter((m) => m.type === "TAKE_TOKENS");
    const twoSameMind = moves.find(
      (m) => m.type === "TAKE_TOKENS" && m.colors.length === 2 && m.colors[0] === "mind" && m.colors[1] === "mind",
    );
    expect(twoSameMind).toBeUndefined();
    const distinctWithMind = moves.filter((m) => m.type === "TAKE_TOKENS" && m.colors.includes("mind"));
    expect(distinctWithMind.length).toBeGreaterThan(0);
    // 5 stones all with supply >= 1: same 3-distinct/2-distinct/1 counts as full supply (10+10+5),
    // but only 4 of the 5 stones (not mind) qualify for 2-same.
    expect(moves.length).toBe(10 + 10 + 5 + 4);
    expectAllValid(state, 0, moves);
  });
});

describe("legalMoves — RESERVE", () => {
  it("one move per visible market slot plus one deck-blind-reserve per non-empty level", () => {
    const state = makeState(2, {
      market: { 1: ["c1-01", "c1-02", null, null], 2: ["c2-01", null, null, null], 3: [null, null, null, null] },
      decks: { 1: ["c1-03"], 2: [], 3: ["c3-02", "c3-03"] },
    });
    const moves = legalMoves(state, 0).filter((m) => m.type === "RESERVE");
    // market: 2 (level1) + 1 (level2) + 0 (level3) = 3
    // deck-blind: level1 (non-empty) + level3 (non-empty) = 2; level2 empty deck -> none
    expect(moves.length).toBe(5);
    expectAllValid(state, 0, moves);

    const marketMoves = moves.filter((m) => m.type === "RESERVE" && m.from === "market");
    expect(marketMoves).toHaveLength(3);
    const deckMoves = moves.filter((m) => m.type === "RESERVE" && m.from === "deck");
    expect(deckMoves.map((m) => (m.type === "RESERVE" && m.from === "deck" ? m.level : null)).sort()).toEqual([
      1, 3,
    ]);
  });

  it("produces zero RESERVE moves once the player already has 3 reserved cards", () => {
    const state = makeState(2, {
      market: { 1: ["c1-01", null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
      decks: { 1: ["c1-02"], 2: [], 3: [] },
      players: [
        makePlayer(0, {
          reserved: [
            { cardId: "c1-03", hidden: true },
            { cardId: "c1-04", hidden: true },
            { cardId: "c1-05", hidden: true },
          ],
        }),
        makePlayer(1),
      ],
    });
    expect(state.players[0].reserved.length).toBe(MAX_RESERVED);
    const moves = legalMoves(state, 0).filter((m) => m.type === "RESERVE");
    expect(moves).toHaveLength(0);
  });
});

describe("legalMoves — RECRUIT", () => {
  it("only includes market cards the player can currently afford", () => {
    const cheap = getCard("c1-01"); // cost {mind:1, space:1, soul:1, reality:1}
    const expensive = getCard("c3-01"); // level 3, much pricier
    const state = makeState(2, {
      market: { 1: [cheap.id, null, null, null], 2: [null, null, null, null], 3: [expensive.id, null, null, null] },
      players: [makePlayer(0, { tokens: { ...emptyTokens(), mind: 1, space: 1, soul: 1, reality: 1 } }), makePlayer(1)],
    });
    const moves = legalMoves(state, 0).filter((m) => m.type === "RECRUIT");
    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({ type: "RECRUIT", from: "market", cardId: cheap.id });
    expectAllValid(state, 0, moves);
  });

  it("includes affordable cards from the player's own reserve", () => {
    const card = getCard("c1-07"); // cost { soul: 3 }
    const state = makeState(2, {
      players: [
        makePlayer(0, {
          bonuses: { ...emptyStones(), soul: 3 },
          reserved: [{ cardId: card.id, hidden: true }],
        }),
        makePlayer(1),
      ],
    });
    const moves = legalMoves(state, 0).filter((m) => m.type === "RECRUIT");
    expect(moves).toEqual([{ type: "RECRUIT", from: "reserve", cardId: card.id }]);
    expectAllValid(state, 0, moves);
  });
});

describe("legalMoves — pending actions", () => {
  it("RETURN_TOKENS: every combo sums exactly to mustReturn and respects holdings", () => {
    const state = makeState(2, {
      pending: { type: "RETURN_TOKENS", mustReturn: 2 },
      players: [
        makePlayer(0, { tokens: { ...emptyTokens(), mind: 1, space: 1, shield: 1 } }),
        makePlayer(1),
      ],
    });
    const moves = legalMoves(state, 0);
    expect(moves.length).toBeGreaterThan(0);
    for (const move of moves) {
      expect(move.type).toBe("RETURN_TOKENS");
      if (move.type !== "RETURN_TOKENS") continue;
      const total = Object.values(move.tokens).reduce((a, b) => a + (b ?? 0), 0);
      expect(total).toBe(2);
      expect(move.tokens.time ?? 0).toBe(0);
    }
    // Held: mind=1, space=1, shield=1 (3 tokens total); choosing 2 of these 3 distinct
    // singleton-holdings colors: C(3,2) = 3 distinct pairs, each amount forced to 1+1.
    expect(moves.length).toBe(3);
    expectAllValid(state, 0, moves);
  });

  it("RETURN_TOKENS: allows returning 2 of the same color when 2+ are held", () => {
    const state = makeState(2, {
      pending: { type: "RETURN_TOKENS", mustReturn: 2 },
      players: [makePlayer(0, { tokens: { ...emptyTokens(), mind: 2 } }), makePlayer(1)],
    });
    const moves = legalMoves(state, 0);
    expect(moves).toEqual([{ type: "RETURN_TOKENS", tokens: { mind: 2 } }]);
    expectAllValid(state, 0, moves);
  });

  it("CHOOSE_LOCATION: exactly one move per offered option", () => {
    const state = makeState(2, {
      pending: { type: "CHOOSE_LOCATION", options: ["loc-01a", "loc-02a"] },
    });
    const moves = legalMoves(state, 0);
    expect(moves).toEqual([
      { type: "CHOOSE_LOCATION", locationId: "loc-01a" },
      { type: "CHOOSE_LOCATION", locationId: "loc-02a" },
    ]);
    expectAllValid(state, 0, moves);
  });

  it("while pending, no TAKE_TOKENS/RESERVE/RECRUIT moves are offered", () => {
    const state = makeState(2, {
      pending: { type: "RETURN_TOKENS", mustReturn: 1 },
      players: [makePlayer(0, { tokens: { ...emptyTokens(), mind: 1 } }), makePlayer(1)],
      market: { 1: ["c1-01", null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
    });
    const moves = legalMoves(state, 0);
    expect(moves.every((m) => m.type === "RETURN_TOKENS")).toBe(true);
  });
});

describe("legalMoves — turn/status gating", () => {
  it("returns [] when it is not the seat's turn", () => {
    const state = makeState(2);
    expect(legalMoves(state, 1)).toEqual([]);
  });

  it("returns [] once the game is finished", () => {
    const state = makeState(2, { status: "finished", winnerSeat: 0 });
    expect(legalMoves(state, 0)).toEqual([]);
  });

  it("never returns TIMEOUT_SKIP or END_BY_CLOCK", () => {
    const state = makeState(2);
    const moves = legalMoves(state, 0);
    expect(moves.some((m) => m.type === "TIMEOUT_SKIP" || m.type === "END_BY_CLOCK")).toBe(false);
  });
});
