/**
 * Rebuilds the boards a viewer missed. Only the latest state is stored, but
 * the engine is deterministic: dealing from the game's seed and re-applying
 * its move log reproduces every position in between, so a device that was
 * waiting can be shown each move in turn instead of jumping to the result.
 */
import { isDeepStrictEqual } from "node:util";

import { boardEvents, duelEvents, type BoardEvent } from "@/lib/board-events";
import { isAway, type GameSettings } from "@/lib/engine/types";
import { applyAny, createAny, isDuel, rankable, redactAny, rulesOf, type AnyMove, type AnyState, type AnyView } from "@/lib/game-rules";
import { TURN_BANNER_MS } from "@/lib/playback";

export interface GameStep {
  seat: number;
  move: AnyMove;
  /** The board right after this move, as the viewer is allowed to see it. */
  view: AnyView;
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
  moves: Array<{ seat: number; move: AnyMove }>;
  since: number;
  viewerSeat: number;
  finalState: AnyState;
}): GameStep[] | null {
  const { seed, settings, playerCount, moves, since, viewerSeat, finalState } = args;
  try {
    let state = createAny(rulesOf(settings), playerCount, seed, settings);
    const steps: GameStep[] = [];
    moves.forEach(({ seat, move }, ordinal) => {
      state = applyAny(state, seat, move);
      if (ordinal >= since) steps.push({ seat, move, view: redactAny(state, viewerSeat) });
    });
    // Compared as plain JSON, the way the stored state comes back from the database.
    const same = isDeepStrictEqual(
      JSON.parse(JSON.stringify(redactAny(state, viewerSeat))),
      JSON.parse(JSON.stringify(redactAny(finalState, viewerSeat))),
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
  moves: Array<{ seat: number; move: AnyMove }>;
}): MoveSummary[] {
  const { seed, settings, playerCount, moves } = args;
  try {
    let state = createAny(rulesOf(settings), playerCount, seed, settings);
    return moves.map(({ seat, move }, i) => {
      const before = state;
      state = applyAny(state, seat, move);
      // A Duel has no rounds or announced tiles; its turns count two to a round.
      if (isDuel(state) || isDuel(before)) {
        return { round: Math.floor(i / 2) + 1, points: rankable(state).players[seat].points, events: isDuel(state) && isDuel(before) ? duelEvents(before, state, { seat, move }) : [] };
      }
      return { round: before.round, points: state.players[seat].points, events: boardEvents(before, state) };
    });
  } catch {
    return [];
  }
}

/** Milliseconds left on the current turn, or null when turns are untimed, the game is paused, or it is over. */
export function turnEndsInMs(state: Pick<AnyState, "status" | "settings" | "paused">, turnStartedAt: Date, now = Date.now()): number | null {
  if (state.status !== "active" || state.settings.turnTimeSeconds === null || state.paused) return null;
  return turnStartedAt.getTime() + TURN_BANNER_MS + state.settings.turnTimeSeconds * 1000 - now;
}

/**
 * Whether a game waits for its player to come back: paused by them, or, against bots, its turn run out
 * while nobody was at the table. The player resumes it with a fresh turn clock instead of losing the turn.
 */
export function isPaused(mode: string, state: Pick<AnyState, "status" | "settings" | "paused">, turnStartedAt: Date, now = Date.now()): boolean {
  if (state.status !== "active") return false;
  if (state.paused) return true;
  const left = turnEndsInMs(state, turnStartedAt, now);
  return mode === "VS_BOT" && left !== null && left <= 0;
}

/** True when nobody is playing any more: every person at the table is away. Bots don't count. */
export function isTableIdle(humanSeats: number[], state: Pick<AnyState, "players">): boolean {
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
