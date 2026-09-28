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

/** Milliseconds left on the current turn, or null when turns are untimed or the game is over. */
export function turnEndsInMs(state: GameState, turnStartedAt: Date, now = Date.now()): number | null {
  if (state.status !== "active" || state.settings.turnTimeSeconds === null) return null;
  return turnStartedAt.getTime() + TURN_BANNER_MS + state.settings.turnTimeSeconds * 1000 - now;
}

/** Missed turns in a row, by every person at the table, before a game is closed. */
export const IDLE_TURNS = 3;

/**
 * True when nobody is playing any more: every person's last `IDLE_TURNS`
 * turns all ran out the clock. Bots don't count, and one person still playing
 * keeps the game open.
 *
 * ponytail: a turn skipped for having no legal move is logged as the same
 * TIMEOUT_SKIP and counts as idle here. Record the reason on the move if
 * that rare case ever closes a game that was really being played.
 */
export function isTableIdle(
  humanSeats: number[],
  /** Latest first. */
  recentMoves: Array<{ seat: number; move: Move }>,
): boolean {
  if (humanSeats.length === 0) return false;
  // The game clock running out is logged against whoever was up, but isn't their move.
  const turns = recentMoves.filter((m) => m.move.type !== "END_BY_CLOCK");
  return humanSeats.every((seat) => {
    const latest = turns.filter((m) => m.seat === seat).slice(0, IDLE_TURNS);
    return latest.length === IDLE_TURNS && latest.every((m) => m.move.type === "TIMEOUT_SKIP");
  });
}

/**
 * Milliseconds left on the game clock, or null when there is none. Games
 * from before `startedAt` was recorded are timed from when they were created.
 */
export function gameEndsInMs(settings: GameSettings, createdAt: Date, now = Date.now()): number | null {
  if (settings.gameTimeMinutes === null) return null;
  return (settings.startedAt ?? createdAt.getTime()) + settings.gameTimeMinutes * 60_000 - now;
}
