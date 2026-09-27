import { describe, expect, it } from "vitest";
import { qualifiesForWin } from "@/lib/engine/rules";
import type { BotDifficulty, PlayerState } from "@/lib/engine/types";
import { MOVE_CEILING, simulateBotGame } from "./sim-helpers";

/**
 * Asserts the shared postconditions ARCHITECTURE.md §1 requires of any
 * finished game, regardless of seed/player count/difficulty:
 *  - the sim terminated well under the move ceiling (simulateBotGame itself
 *    throws if it doesn't — this is a belt-and-suspenders re-check),
 *  - a winner (or a genuine tie pool) is set, never both, never neither,
 *  - whoever is declared winner(s) actually meets the compound win
 *    condition (>= targetPoints, all 5 basic bonuses, holds the Time Stone)
 *    — i.e. the tiebreak in rules.ts picked among real qualifiers.
 */
function assertSaneFinish(result: { state: ReturnType<typeof simulateBotGame>["state"]; moveCount: number }) {
  const { state, moveCount } = result;
  expect(moveCount).toBeLessThan(MOVE_CEILING);
  expect(state.status).toBe("finished");

  const hasWinner = state.winnerSeat !== null;
  const hasShared = state.sharedWinners !== null;
  expect(hasWinner !== hasShared).toBe(true); // exactly one of the two is set

  const winners: PlayerState[] = hasWinner
    ? [state.players[state.winnerSeat as number]]
    : (state.sharedWinners as number[]).map((seat) => state.players[seat]);

  expect(winners.length).toBeGreaterThan(0);
  if (!state.clockExpired) {
    for (const winner of winners) {
      expect(qualifiesForWin(winner, state.settings)).toBe(true);
    }
  }
}

const PLAYER_COUNTS = [2, 3, 4] as const;
const SEEDS = ["marvel-alpha", "marvel-bravo"] as const;

describe("bot vs bot full-game simulations", () => {
  describe.each(PLAYER_COUNTS)("%i players, normal difficulty", (playerCount) => {
    it.each(SEEDS)("terminates with a valid winner (seed=%s)", (seed) => {
      const result = simulateBotGame(playerCount, seed, { botDifficulty: "normal" });
      assertSaneFinish(result);
    });
  });

  describe.each([2, 4] as const)("%i players, easy difficulty", (playerCount) => {
    it.each(SEEDS)("terminates with a valid winner (seed=%s)", (seed) => {
      const result = simulateBotGame(playerCount, seed, { botDifficulty: "easy" });
      assertSaneFinish(result);
    });
  });

  describe.each([2, 3] as const)("%i players, hard difficulty", (playerCount) => {
    it.each(SEEDS)("terminates with a valid winner (seed=%s)", (seed) => {
      const result = simulateBotGame(playerCount, seed, { botDifficulty: "hard" });
      assertSaneFinish(result);
    });
  });

  it("is fully deterministic given the same seed/settings (no hidden randomness)", () => {
    const a = simulateBotGame(3, "determinism-check", { botDifficulty: "normal" });
    const b = simulateBotGame(3, "determinism-check", { botDifficulty: "normal" });
    expect(a.moveCount).toBe(b.moveCount);
    expect(a.state).toEqual(b.state);
  });

  it("respects a lowered targetPoints setting", () => {
    const result = simulateBotGame(2, "low-target", { botDifficulty: "normal", targetPoints: 10 });
    assertSaneFinish(result);
  });

  const DIFFICULTIES: BotDifficulty[] = ["easy", "normal", "hard"];
  it.each(DIFFICULTIES)("%s difficulty: bot never proposes a move that fails validateMove mid-game", (difficulty) => {
    // simulateBotGame already asserts this at every single state visited;
    // this test just makes sure each tier gets its own explicit assertion
    // point per the task's "test all three difficulty tiers at least once
    // each" requirement, independent of the matrices above.
    const result = simulateBotGame(2, "tier-smoke-test", { botDifficulty: difficulty });
    assertSaneFinish(result);
  });
});
