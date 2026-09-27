/**
 * Shared bot-vs-bot simulation driver for tests/bot/*.test.ts. Not a test
 * file itself (no `.test.ts` suffix) — vitest.config.ts only picks up
 * tests/**\/*.test.ts, mirroring tests/engine/helpers.ts's convention.
 */
import { applyMove } from "@/lib/engine/apply";
import { legalMoves } from "@/lib/engine/legal-moves";
import { createGame } from "@/lib/engine/setup";
import { validateMove } from "@/lib/engine/validate";
import type { GameSettings, GameState } from "@/lib/engine/types";
import { chooseBotMove } from "@/lib/bot/policy";

/** Generous ceiling per ARCHITECTURE.md's testing strategy — a real game
 * (even 4p) should finish in well under this many individual move/sub-move
 * applications. Hitting it means a real termination bug, not a slow game. */
export const MOVE_CEILING = 500;

export interface SimResult {
  state: GameState;
  moveCount: number;
}

/**
 * Drives one all-bot game from `createGame` to `status === "finished"` by
 * alternating chooseBotMove -> validateMove -> applyMove. Because
 * applyMove only advances `currentSeat` once no pending action remains, this
 * simple loop automatically keeps re-invoking chooseBotMove for the same
 * seat across any RETURN_TOKENS/CHOOSE_LOCATION pending sub-moves before
 * moving on — no special-casing needed here.
 *
 * At every state visited, independently re-validates every move
 * `legalMoves` produced (not just the one the bot picked) — this is the
 * exhaustive "every generated move must pass validateMove" check the bot
 * task calls for, exercised across whatever states real games actually
 * reach rather than only hand-picked scenarios.
 */
export function simulateBotGame(
  playerCount: number,
  seed: string,
  settings: Partial<GameSettings> = {},
): SimResult {
  let state = createGame(playerCount, seed, settings);
  let moveCount = 0;

  while (state.status === "active") {
    if (moveCount >= MOVE_CEILING) {
      throw new Error(
        `Game did not terminate within ${MOVE_CEILING} moves ` +
          `(seed=${seed}, playerCount=${playerCount}, difficulty=${settings.botDifficulty ?? "normal"}, round=${state.round}).`,
      );
    }

    const seat = state.currentSeat;
    const candidates = legalMoves(state, seat);
    if (candidates.length === 0) {
      throw new Error(
        `legalMoves returned zero moves for seat ${seat} (pending=${JSON.stringify(state.pending)}, ` +
          `seed=${seed}, playerCount=${playerCount}).`,
      );
    }
    for (const candidate of candidates) {
      const result = validateMove(state, seat, candidate);
      if (!result.ok) {
        throw new Error(
          `legalMoves produced a move that failed validateMove for seat ${seat}: ` +
            `${JSON.stringify(candidate)} — ${result.reason} (seed=${seed}, playerCount=${playerCount}).`,
        );
      }
    }

    const move = chooseBotMove(state, seat);
    const validation = validateMove(state, seat, move);
    if (!validation.ok) {
      throw new Error(
        `chooseBotMove chose an invalid move for seat ${seat}: ${JSON.stringify(move)} — ${validation.reason} ` +
          `(seed=${seed}, playerCount=${playerCount}).`,
      );
    }

    state = applyMove(state, seat, move);
    moveCount += 1;
  }

  return { state, moveCount };
}
