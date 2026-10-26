/**
 * One surface over the two games for the server: which engine a game plays
 * is `rules` in its settings ("duel"), absent for the Marvel game. The routes,
 * the server loop and the records call these and never an engine directly.
 */
import { chooseDuelBotMove } from "@/lib/bot/duel-policy";
import { chooseBotMove } from "@/lib/bot/policy";
import { applyDuelMove } from "@/lib/duel/apply";
import { legalDuelMoves } from "@/lib/duel/legal-moves";
import { crownsOf, pointsOf } from "@/lib/duel/rules";
import { createDuel } from "@/lib/duel/setup";
import type { DuelMove, DuelState } from "@/lib/duel/types";
import { validateDuelMove } from "@/lib/duel/validate";
import { redactDuel, type DuelView } from "@/lib/duel/view";
import { applyMove } from "@/lib/engine/apply";
import { legalMoves } from "@/lib/engine/legal-moves";
import { createGame } from "@/lib/engine/setup";
import type { GameSettings, GameState, Move } from "@/lib/engine/types";
import { validateMove } from "@/lib/engine/validate";
import type { RankableState } from "@/lib/game-record";
import { redactState, type RedactedGameState } from "@/lib/game-view";

export type Rules = "marvel" | "duel";
export type AnyState = GameState | DuelState;
export type AnyMove = Move | DuelMove;
export type AnyView = RedactedGameState | DuelView;

export const rulesOf = (settings: Pick<GameSettings, "rules"> | null | undefined): Rules => settings?.rules ?? "marvel";
export const isDuel = (state: AnyState): state is DuelState => "rules" in state && state.rules === "duel";

export function createAny(rules: Rules, playerCount: number, seed: string, settings: Partial<GameSettings>): AnyState {
  return rules === "duel" ? createDuel(seed, settings) : createGame(playerCount, seed, settings);
}

export function validateAny(state: AnyState, seat: number, move: AnyMove): { ok: true } | { ok: false; reason: string } {
  return isDuel(state) ? validateDuelMove(state, seat, move as DuelMove) : validateMove(state, seat, move as Move);
}

export function applyAny(state: AnyState, seat: number, move: AnyMove): AnyState {
  return isDuel(state) ? applyDuelMove(state, seat, move as DuelMove) : applyMove(state, seat, move as Move);
}

export function legalAny(state: AnyState, seat: number): AnyMove[] {
  return isDuel(state) ? legalDuelMoves(state, seat) : legalMoves(state, seat);
}

export function chooseBotAny(state: AnyState, seat: number): AnyMove {
  return isDuel(state) ? chooseDuelBotMove(state, seat) : chooseBotMove(state, seat);
}

export function redactAny(state: AnyState, viewerSeat: number): AnyView {
  return isDuel(state) ? redactDuel(state, viewerSeat) : redactState(state, viewerSeat);
}

/** How many seats a game of these rules takes; a Duel is always two. */
export const seatsFor = (rules: Rules, playerCount: number): number => (rules === "duel" ? 2 : playerCount);

/** The parts of a finished game the records read, the same shape for both games: crowns stand as tags in Duel. */
export function rankable(state: AnyState): RankableState & { players: Array<{ seat: number; points: number; cards: string[]; tags: number }> } {
  if (!isDuel(state)) return state;
  return {
    players: state.players.map((p) => ({ seat: p.seat, points: pointsOf(p), cards: p.cards.map((c) => c.cardId), tags: crownsOf(p) })),
    winnerSeat: state.winnerSeat,
    sharedWinners: null,
  };
}
