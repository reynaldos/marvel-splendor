import { describe, expect, it } from "vitest";

import { chooseBotMove } from "@/lib/bot/policy";
import { applyMove } from "@/lib/engine/apply";
import { createGame } from "@/lib/engine/setup";
import { DEFAULT_SETTINGS, type Move } from "@/lib/engine/types";
import { replaySteps } from "@/lib/game-replay";
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
