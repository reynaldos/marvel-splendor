/**
 * Rebuilds the boards a viewer missed. Only the latest state is stored, but
 * the engine is deterministic: dealing from the game's seed and re-applying
 * its move log reproduces every position in between, so a device that was
 * waiting can be shown each move in turn instead of jumping to the result.
 */
import { isDeepStrictEqual } from "node:util";

import { applyMove } from "@/lib/engine/apply";
import { createGame } from "@/lib/engine/setup";
import type { GameSettings, GameState, Move } from "@/lib/engine/types";
import { redactState, type RedactedGameState } from "@/lib/game-view";

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

/** Milliseconds left on the current turn, or null when turns are untimed or the game is over. */
export function turnEndsInMs(state: GameState, turnStartedAt: Date, now = Date.now()): number | null {
  if (state.status !== "active" || state.settings.turnTimeSeconds === null) return null;
  return turnStartedAt.getTime() + state.settings.turnTimeSeconds * 1000 - now;
}
