/**
 * The Duel bot: scores every legal move by the state it leaves, resolving any
 * choice the move opens the same way, and takes the best. One ply, like the
 * Marvel bot's easy and normal levels: Duel's moves are few and its games
 * short, so a flat score plays a fair game. Ties go to the first move listed,
 * so a game from a seed replays the same.
 */
import { applyDuelMove } from "@/lib/duel/apply";
import { legalDuelMoves } from "@/lib/duel/legal-moves";
import { bonusesOf, colorPointsOf, crownsOf, pointsOf } from "@/lib/duel/rules";
import { HAND_LIMIT, STONES, totalTokens, type DuelMove, type DuelPlayer, type DuelState } from "@/lib/duel/types";
import { botDifficultyForSeat, type BotDifficulty } from "@/lib/engine/types";

interface Weights {
  points: number;
  crowns: number;
  colorRun: number;
  bonus: number;
  privilege: number;
  token: number;
  /** How much the opponent's standing counts against a move. */
  rival: number;
}

const WEIGHTS: Record<BotDifficulty, Weights> = {
  easy: { points: 10, crowns: 3, colorRun: 1, bonus: 2, privilege: 1, token: 0.3, rival: 0 },
  normal: { points: 12, crowns: 5, colorRun: 3, bonus: 2.5, privilege: 2, token: 0.4, rival: 0.6 },
  hard: { points: 12, crowns: 6, colorRun: 4, bonus: 3, privilege: 2.5, token: 0.4, rival: 1 },
};

function standing(player: DuelPlayer, w: Weights): number {
  const bonuses = bonusesOf(player);
  const colorRun = Math.max(...STONES.map((s) => colorPointsOf(player)[s]));
  const held = totalTokens(player.tokens);
  return (
    pointsOf(player) * w.points +
    crownsOf(player) * w.crowns +
    colorRun * w.colorRun +
    STONES.reduce((sum, s) => sum + bonuses[s], 0) * w.bonus +
    player.privileges * w.privilege +
    Math.min(held, HAND_LIMIT) * w.token -
    Math.max(0, held - HAND_LIMIT) * 5
  );
}

function score(state: DuelState, seat: number, w: Weights): number {
  if (state.status === "finished") return state.winnerSeat === seat ? 1e6 : -1e6;
  return standing(state.players[seat], w) - standing(state.players[1 - seat], w) * w.rival;
}

const FREE: DuelMove["type"][] = ["SPEND_PRIVILEGE", "REFILL"];

/**
 * The state a move leads to, with any choices it opens made the best way. A free move keeps the turn, so it is
 * followed by the best action it then allows: that is what makes it worth comparing with taking the action now.
 */
function take(state: DuelState, seat: number, move: DuelMove, w: Weights): DuelState {
  let next = settle(applyDuelMove(state, seat, move), seat, w);
  if (FREE.includes(move.type) && next.status === "active" && next.currentSeat === seat && !next.pending) {
    let best: DuelState | null = null;
    let bestScore = -Infinity;
    for (const action of legalDuelMoves(next, seat)) {
      if (FREE.includes(action.type)) continue;
      const after = settle(applyDuelMove(next, seat, action), seat, w);
      const s = score(after, seat, w);
      if (s > bestScore) [best, bestScore] = [after, s];
    }
    if (best) next = best;
  }
  return next;
}

/** The state once every choice a move opened is made the best way. */
function settle(state: DuelState, seat: number, w: Weights): DuelState {
  let next = state;
  while (next.status === "active" && next.pending && next.currentSeat === seat) {
    let best: DuelState | null = null;
    let bestScore = -Infinity;
    for (const choice of legalDuelMoves(next, seat)) {
      const after = applyDuelMove(next, seat, choice);
      const s = score(after, seat, w);
      if (s > bestScore) [best, bestScore] = [after, s];
    }
    if (!best) break;
    next = best;
  }
  return next;
}

export function chooseDuelBotMove(state: DuelState, seat: number): DuelMove {
  const w = WEIGHTS[botDifficultyForSeat(state.settings, seat)];
  const candidates = legalDuelMoves(state, seat);
  if (candidates.length === 0) throw new Error(`chooseDuelBotMove: no legal moves for seat ${seat}`);
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const move of candidates) {
    // A free move is only worth it for what the turn can do after it; the scorer sees that through the pick.
    const s = score(take(state, seat, move, w), seat, w) - (move.type === "REFILL" ? w.privilege : 0);
    if (s > bestScore) [best, bestScore] = [move, s];
  }
  return best;
}
