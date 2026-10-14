import { describe, expect, it } from "vitest";

import { chooseBotMove } from "@/lib/bot/policy";
import { applyMove } from "@/lib/engine/apply";
import { createGame } from "@/lib/engine/setup";
import { DEFAULT_SETTINGS, isAway, type GameState, type Move } from "@/lib/engine/types";
import { validateMove } from "@/lib/engine/validate";
import { isTableIdle, replaySteps } from "@/lib/game-replay";
import { runServerTurnLoop } from "@/lib/game-server";
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

describe("a player who stops playing", () => {
  const SKIP: Move = { type: "TIMEOUT_SKIP" };
  const nobodyIsABot = () => false;
  const start = () => createGame(2, "away-b", { ...settings, turnTimeSeconds: 30 });
  const play = (state: GameState) => applyMove(state, state.currentSeat, chooseBotMove(state, state.currentSeat));
  const skip = (state: GameState) => applyMove(state, state.currentSeat, SKIP);
  /** Seat 0 lets `times` turns run out while seat 1 plays on; ends with seat 0 up. */
  const seatZeroMisses = (times: number) => {
    let state = start();
    for (let i = 0; i < times; i++) state = play(skip(state));
    return state;
  };

  it("is away after three missed turns in a row, and not before", () => {
    expect(isAway(seatZeroMisses(2).players[0])).toBe(false);
    expect(isAway(seatZeroMisses(3).players[0])).toBe(true);
    expect(isAway(seatZeroMisses(3).players[1])).toBe(false);
  });
  it("starts the count again after a turn is played", () => {
    const state = skip(play(play(seatZeroMisses(2))));
    expect(state.players[0].missedTurns).toBe(1);
  });
  it("does not count the game clock running out as a turn played", () => {
    const state = skip(applyMove(seatZeroMisses(2), 0, { type: "END_BY_CLOCK" }));
    expect(isAway(state.players[0])).toBe(true);
  });
  it("does not count a turn skipped for having no move", () => {
    let state = start();
    for (let i = 0; i < 3; i++) state = play(applyMove(state, 0, { type: "TIMEOUT_SKIP", stuck: true }));
    expect(isAway(state.players[0])).toBe(false);
  });

  it("has a bot play their turns, and stays away while it does", () => {
    const { state, applied } = runServerTurnLoop(seatZeroMisses(3), nobodyIsABot);
    expect(applied.length).toBeGreaterThan(0);
    expect(applied.every((m) => m.seat === 0 && m.move.type !== "TIMEOUT_SKIP")).toBe(true);
    expect(state.currentSeat).toBe(1);
    expect(isAway(state.players[0])).toBe(true);
  });
  it("stops playing once nobody is left at the table", () => {
    const { state, applied } = runServerTurnLoop(seatZeroMisses(3), (seat) => seat === 1);
    expect(applied).toEqual([]);
    expect(state.status).toBe("active");
  });
  it("leaves a player who is merely late to play their own turn", () => {
    expect(runServerTurnLoop(seatZeroMisses(2), nobodyIsABot).applied).toEqual([]);
  });

  it("can come back at any time, without taking a turn", () => {
    const away = runServerTurnLoop(seatZeroMisses(3), nobodyIsABot).state;
    expect(validateMove(away, 0, { type: "REJOIN" }).ok).toBe(true);
    expect(validateMove(away, 1, { type: "REJOIN" }).ok).toBe(false);

    const back = applyMove(away, 0, { type: "REJOIN" });
    expect(isAway(back.players[0])).toBe(false);
    expect(back.currentSeat).toBe(1);
    expect(back.moveCount).toBe(away.moveCount + 1);
    expect(runServerTurnLoop(play(back), nobodyIsABot).applied).toEqual([]);
  });

  it("closes the table only once every person is away", () => {
    const state = seatZeroMisses(3);
    expect(isTableIdle([0], state)).toBe(true);
    expect(isTableIdle([0, 1], state)).toBe(false);
    expect(isTableIdle([], state)).toBe(false);
  });

  it("replays to the stored board", () => {
    let state = start();
    const moves: Array<{ seat: number; move: Move }> = [];
    const apply = (seat: number, move: Move) => {
      state = applyMove(state, seat, move);
      moves.push({ seat, move });
    };
    for (let i = 0; i < 3; i++) {
      apply(0, SKIP);
      apply(1, chooseBotMove(state, 1));
    }
    apply(0, chooseBotMove(state, 0));
    apply(0, { type: "REJOIN" });
    const steps = replaySteps({
      seed: "away-b",
      settings: state.settings,
      playerCount: 2,
      moves,
      since: 0,
      viewerSeat: 1,
      finalState: JSON.parse(JSON.stringify(state)),
    });
    expect(steps).toHaveLength(moves.length);
    expect(steps!.map((s) => s.view.players[0].away)).toEqual([false, false, false, false, true, true, true, false]);
  });
});
