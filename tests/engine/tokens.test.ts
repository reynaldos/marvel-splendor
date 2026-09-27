import { describe, expect, it } from "vitest";
import { applyMove } from "@/lib/engine/apply";
import { validateMove } from "@/lib/engine/validate";
import type { Move } from "@/lib/engine/types";
import { makeState } from "./helpers";

describe("TAKE_TOKENS", () => {
  it("allows 3 distinct colors when supply permits", () => {
    const state = makeState(2);
    const move: Move = { type: "TAKE_TOKENS", colors: ["mind", "space", "soul"] };
    expect(validateMove(state, 0, move).ok).toBe(true);
    const next = applyMove(state, 0, move);
    expect(next.players[0].tokens.mind).toBe(1);
    expect(next.players[0].tokens.space).toBe(1);
    expect(next.players[0].tokens.soul).toBe(1);
    expect(next.supply.mind).toBe(3);
    expect(next.supply.space).toBe(3);
    expect(next.supply.soul).toBe(3);
    // Turn should have advanced (no pending, no hand-limit issue).
    expect(next.currentSeat).toBe(1);
  });

  it("allows fewer than 3 distinct colors voluntarily", () => {
    const state = makeState(2);
    const move: Move = { type: "TAKE_TOKENS", colors: ["mind"] };
    expect(validateMove(state, 0, move).ok).toBe(true);
  });

  it("allows 2 of the same color only when that supply is >= 4", () => {
    const state = makeState(2, {
      supply: { mind: 4, space: 4, soul: 4, power: 4, reality: 4, time: 2, shield: 5 },
    });
    const move: Move = { type: "TAKE_TOKENS", colors: ["mind", "mind"] };
    expect(validateMove(state, 0, move).ok).toBe(true);
    const next = applyMove(state, 0, move);
    expect(next.players[0].tokens.mind).toBe(2);
    expect(next.supply.mind).toBe(2);
  });

  it("rejects 2 of the same color when supply is below 4", () => {
    const state = makeState(2, {
      supply: { mind: 3, space: 4, soul: 4, power: 4, reality: 4, time: 2, shield: 5 },
    });
    const move: Move = { type: "TAKE_TOKENS", colors: ["mind", "mind"] };
    expect(validateMove(state, 0, move).ok).toBe(false);
  });

  it("rejects 3 of the same color", () => {
    const state = makeState(2);
    const move: Move = { type: "TAKE_TOKENS", colors: ["mind", "mind", "mind"] };
    expect(validateMove(state, 0, move).ok).toBe(false);
  });

  it("rejects more than 3 colors", () => {
    const state = makeState(2);
    const move: Move = { type: "TAKE_TOKENS", colors: ["mind", "space", "soul", "power"] };
    expect(validateMove(state, 0, move).ok).toBe(false);
  });

  it("rejects taking a color with no supply left", () => {
    const state = makeState(2, {
      supply: { mind: 0, space: 4, soul: 4, power: 4, reality: 4, time: 2, shield: 5 },
    });
    const move: Move = { type: "TAKE_TOKENS", colors: ["mind", "space", "soul"] };
    expect(validateMove(state, 0, move).ok).toBe(false);
  });

  it("rejects a move from the wrong seat", () => {
    const state = makeState(2);
    const move: Move = { type: "TAKE_TOKENS", colors: ["mind"] };
    expect(validateMove(state, 1, move).ok).toBe(false);
  });

  it("rejects any move once the game is finished", () => {
    const state = makeState(2, { status: "finished", winnerSeat: 0 });
    const move: Move = { type: "TAKE_TOKENS", colors: ["mind"] };
    expect(validateMove(state, 0, move).ok).toBe(false);
  });
});
