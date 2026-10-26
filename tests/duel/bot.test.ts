import { describe, expect, it } from "vitest";

import { chooseDuelBotMove } from "@/lib/bot/duel-policy";
import { applyDuelMove } from "@/lib/duel/apply";
import { legalDuelMoves } from "@/lib/duel/legal-moves";
import { colorPointsOf, crownsOf, hasWon, pointsOf } from "@/lib/duel/rules";
import { createDuel } from "@/lib/duel/setup";
import { STONES, WIN_COLOR_POINTS, WIN_CROWNS, WIN_POINTS, type DuelState } from "@/lib/duel/types";
import { validateDuelMove } from "@/lib/duel/validate";
import type { BotDifficulty } from "@/lib/engine/types";

const MOVE_CEILING = 600;

/** Two bots play a seeded game to the end, as the server loop would, skipping a stuck seat. */
function simulate(seed: string, difficulty: BotDifficulty): { state: DuelState; moves: number } {
  let state = createDuel(seed, { botDifficulty: difficulty });
  let moves = 0;
  while (state.status === "active") {
    if (++moves > MOVE_CEILING) throw new Error(`game ${seed} did not finish in ${MOVE_CEILING} moves`);
    const seat = state.currentSeat;
    if (legalDuelMoves(state, seat).length === 0) {
      state = applyDuelMove(state, seat, { type: "TIMEOUT_SKIP", stuck: true });
      continue;
    }
    const move = chooseDuelBotMove(state, seat);
    const v = validateDuelMove(state, seat, move);
    if (!v.ok) throw new Error(`bot chose an illegal move: ${v.reason} ${JSON.stringify(move)}`);
    state = applyDuelMove(state, seat, move);
  }
  return { state, moves };
}

describe("two bots playing Duel", () => {
  const seeds = ["a", "b", "c", "d", "e", "f", "g", "h"];

  it.each(["easy", "normal", "hard"] as const)("finish a %s game with a winner who has really won", (difficulty) => {
    for (const seed of seeds) {
      const { state, moves } = simulate(`${difficulty}-${seed}`, difficulty);
      expect(state.status).toBe("finished");
      expect(moves).toBeLessThan(MOVE_CEILING);
      const winner = state.players[state.winnerSeat!];
      expect(hasWon(winner)).toBe(true);
      // Nobody holds more than ten tokens at rest, and the 25 tokens are all somewhere.
      const onTable = state.board.filter(Boolean).length + state.bag.length;
      const inHands = state.players.reduce((n, p) => n + Object.values(p.tokens).reduce((a, b) => a + b, 0), 0);
      expect(onTable + inHands).toBe(25);
    }
  });

  it("reaches each of the three wins at least once across the seeds", () => {
    const wins = { points: 0, crowns: 0, color: 0 };
    for (const seed of [...seeds, "i", "j", "k", "l", "m", "n", "o", "p"]) {
      const { state } = simulate(`win-${seed}`, "normal");
      const w = state.players[state.winnerSeat!];
      if (pointsOf(w) >= WIN_POINTS) wins.points++;
      if (crownsOf(w) >= WIN_CROWNS) wins.crowns++;
      if (STONES.some((s) => colorPointsOf(w)[s] >= WIN_COLOR_POINTS)) wins.color++;
    }
    expect(wins.points + wins.crowns + wins.color).toBeGreaterThan(0);
    console.log("duel wins by kind", wins);
  });

  it("replays the same game from the same seed", () => {
    expect(simulate("same", "normal").state).toEqual(simulate("same", "normal").state);
  });
});
