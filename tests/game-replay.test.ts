import { describe, expect, it } from "vitest";

import { chooseBotMove } from "@/lib/bot/policy";
import { applyMove } from "@/lib/engine/apply";
import { createGame } from "@/lib/engine/setup";
import { DEFAULT_SETTINGS, type Move } from "@/lib/engine/types";
import { isTableIdle, replaySteps } from "@/lib/game-replay";
import { redactState } from "@/lib/game-view";

const settings = { ...DEFAULT_SETTINGS, botDifficulty: "normal" as const };

function playMoves(seed: string, count: number) {
  let state = createGame(3, seed, settings);
  const moves: Array<{ seat: number; move: Move }> = [];
  while (moves.length < count && state.status === "active") {
    const seat = state.currentSeat;
    const move = chooseBotMove(state, seat);
    state = applyMove(state, seat, move);
    moves.push({ seat, move });
  }
  return { state, moves };
}

describe("replaySteps", () => {
  it("returns one step per missed move, ending on the stored board", () => {
    const { state, moves } = playMoves("replay-a", 30);
    const steps = replaySteps({
      seed: "replay-a",
      settings,
      playerCount: 3,
      moves,
      since: moves.length - 4,
      viewerSeat: 1,
      // As it comes back from the database.
      finalState: JSON.parse(JSON.stringify(state)),
    });
    expect(steps).toHaveLength(4);
    expect(steps!.map((s) => s.move)).toEqual(moves.slice(-4).map((m) => m.move));
    expect(steps!.at(-1)!.view).toEqual(redactState(state, 1));
  });

  it("refuses a replay that doesn't land on the stored board", () => {
    const { state, moves } = playMoves("replay-a", 30);
    const args = { settings, playerCount: 3, moves, since: 0, viewerSeat: 0, finalState: state };
    expect(replaySteps({ ...args, seed: "a-different-deal" })).toBeNull();
  });
});

describe("isTableIdle", () => {
  const skip = (seat: number) => ({ seat, move: { type: "TIMEOUT_SKIP" } as Move });
  const play = (seat: number) => ({ seat, move: { type: "TAKE_TOKENS", colors: ["mind"] } as Move });

  const clock = (seat: number) => ({ seat, move: { type: "END_BY_CLOCK" } as Move });
  // Latest first: `times` rounds in which every seat given let its turn run out.
  const idleRounds = (times: number, ...seats: number[]) =>
    Array.from({ length: times }, () => seats.toReversed().map(skip)).flat();

  it("closes a table once everyone has missed three turns in a row", () => {
    expect(isTableIdle([0, 1], idleRounds(3, 0, 1))).toBe(true);
    expect(isTableIdle([0], [play(1), skip(0), play(1), skip(0), play(1), skip(0)])).toBe(true);
  });
  it("keeps it open after one or two missed turns", () => {
    expect(isTableIdle([0], [play(1), skip(0)])).toBe(false);
    expect(isTableIdle([0], [play(1), skip(0), play(1), skip(0)])).toBe(false);
    expect(isTableIdle([0, 1], idleRounds(2, 0, 1))).toBe(false);
  });
  it("keeps it open while anyone is still playing", () => {
    expect(isTableIdle([0, 1], [skip(1), skip(0), skip(1), skip(0), play(1), skip(0)])).toBe(false);
  });
  it("starts the count again after a turn is played", () => {
    expect(isTableIdle([0], [skip(0), skip(0), play(0), skip(0)])).toBe(false);
  });
  it("does not count the game clock running out as a turn played", () => {
    expect(isTableIdle([0], [skip(0), clock(0), skip(0), skip(0)])).toBe(true);
  });

});
