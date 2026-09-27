/**
 * Shared scenario-building helpers for engine tests. Not a test file itself
 * (no `.test.ts` suffix) — vitest.config.ts only picks up tests/**\/*.test.ts.
 */
import {
  DEFAULT_SETTINGS,
  emptyStones,
  emptyTokens,
  type CardLevel,
  type GameSettings,
  type GameState,
  type PlayerState,
} from "@/lib/engine/types";

export function makePlayer(seat: number, overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    seat,
    tokens: emptyTokens(),
    cards: [],
    reserved: [],
    locations: [],
    bonuses: emptyStones(),
    tags: 0,
    points: 0,
    ...overrides,
  };
}

/**
 * A minimal-but-fully-shaped GameState for hand-crafted scenario tests.
 * Empty decks/market by default; tests fill in exactly the cards/locations
 * they need for the scenario under test.
 */
export function makeState(
  playerCount: number,
  overrides: Partial<GameState> = {},
  settings: Partial<GameSettings> = {},
): GameState {
  const players = Array.from({ length: playerCount }, (_, i) => makePlayer(i));
  const emptyLevel = <T,>(fill: T[]): Record<CardLevel, T[]> => ({ 1: [...fill], 2: [...fill], 3: [...fill] });

  return {
    playerCount,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    seed: "test-seed",
    players,
    supply: { mind: 4, space: 4, soul: 4, power: 4, reality: 4, time: playerCount, shield: 5 },
    decks: emptyLevel<string>([]),
    market: emptyLevel<string | null>([null, null, null, null]),
    locations: [],
    avengersHolder: null,
    currentSeat: 0,
    startingSeat: 0,
    moveCount: 0,
    round: 0,
    pending: null,
    endTriggered: false,
    clockExpired: false,
    status: "active",
    winnerSeat: null,
    sharedWinners: null,
    ...overrides,
  };
}
