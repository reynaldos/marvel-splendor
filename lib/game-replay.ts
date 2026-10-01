/**
 * Rebuilds the boards a viewer missed. Only the latest state is stored, but
 * the engine is deterministic: dealing from the game's seed and re-applying
 * its move log reproduces every position in between, so a device that was
 * waiting can be shown each move in turn instead of jumping to the result.
 */
import { isDeepStrictEqual } from "node:util";

import { boardEvents, type BoardEvent } from "@/lib/board-events";
import { applyMove } from "@/lib/engine/apply";
import { createGame } from "@/lib/engine/setup";
import { isAway, type GameSettings, type GameState, type Move } from "@/lib/engine/types";
import { redactState, type RedactedGameState } from "@/lib/game-view";
import { TURN_BANNER_MS } from "@/lib/turn-banner";

export interface GameStep {
  seat: number;
  move: Move;
  /** The board right after this move, as the viewer is allowed to see it. */
  view: RedactedGameState;
}

/**
 * The steps from move number `since` onward, or null when the replay can't
 * be trusted — it must land exactly on the stored state, which it won't if
 * the card data changed mid-game. Callers then just show the final board.
 */
export function replaySteps(args: {
  seed: string;
  settings: GameSettings;
  playerCount: number;
  /** The whole move log, in order. */
  moves: Array<{ seat: number; move: Move }>;
  since: number;
  viewerSeat: number;
  finalState: GameState;
}): GameStep[] | null {
  const { seed, settings, playerCount, moves, since, viewerSeat, finalState } = args;
  try {
    let state = createGame(playerCount, seed, settings);
    const steps: GameStep[] = [];
    moves.forEach(({ seat, move }, ordinal) => {
      state = applyMove(state, seat, move);
      if (ordinal >= since) steps.push({ seat, move, view: redactState(state, viewerSeat) });
    });
    // Compared as plain JSON, the way the stored state comes back from the database.
    const same = isDeepStrictEqual(
      JSON.parse(JSON.stringify(redactState(state, viewerSeat))),
      JSON.parse(JSON.stringify(redactState(finalState, viewerSeat))),
    );
    return same ? steps : null;
  } catch {
    return null;
  }
}

/** What a logged move meant: the round it was in, the mover's points after it, and anything it won. */
export interface MoveSummary {
  round: number;
  points: number;
  events: BoardEvent[];
}

/** One summary per move, by replaying the log; empty when the replay can't be trusted. */
export function moveSummaries(args: {
  seed: string;
  settings: GameSettings;
  playerCount: number;
  moves: Array<{ seat: number; move: Move }>;
}): MoveSummary[] {
  const { seed, settings, playerCount, moves } = args;
  try {
    let state = createGame(playerCount, seed, settings);
    return moves.map(({ seat, move }) => {
      const before = state;
      state = applyMove(state, seat, move);
      return { round: before.round, points: state.players[seat].points, events: boardEvents(before, state) };
    });
  } catch {
    return [];
  }
}

/** Milliseconds left on the current turn, or null when turns are untimed or the game is over. */
export function turnEndsInMs(state: GameState, turnStartedAt: Date, now = Date.now()): number | null {
  if (state.status !== "active" || state.settings.turnTimeSeconds === null) return null;
  return turnStartedAt.getTime() + TURN_BANNER_MS + state.settings.turnTimeSeconds * 1000 - now;
}

/** True when nobody is playing any more: every person at the table is away. Bots don't count. */
export function isTableIdle(humanSeats: number[], state: GameState): boolean {
  return humanSeats.length > 0 && humanSeats.every((seat) => isAway(state.players[seat]));
}

/**
 * Milliseconds left on the game clock, or null when there is none. Games
 * from before `startedAt` was recorded are timed from when they were created.
 */
export function gameEndsInMs(settings: GameSettings, createdAt: Date, now = Date.now()): number | null {
  if (settings.gameTimeMinutes === null) return null;
  return (settings.startedAt ?? createdAt.getTime()) + settings.gameTimeMinutes * 60_000 - now;
}
