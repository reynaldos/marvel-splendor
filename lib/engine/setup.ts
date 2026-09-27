import { ALL_LOCATIONS, cardsOfLevel } from "./data";
import { createRng, shuffle } from "./rng";
import {
  type CardLevel,
  type GameSettings,
  type GameState,
  type PlayerState,
  DEFAULT_SETTINGS,
  MARKET_SLOTS,
  emptyStones,
  emptyTokens,
} from "./types";

/** Basic-stone supply per player count (rulebook setup). */
const BASIC_SUPPLY: Record<number, number> = { 2: 4, 3: 5, 4: 7 };
/** Time Stone supply per player count. */
const TIME_SUPPLY: Record<number, number> = { 2: 2, 3: 3, 4: 4 };
const SHIELD_SUPPLY = 5;

function makePlayer(seat: number): PlayerState {
  return {
    seat,
    tokens: emptyTokens(),
    cards: [],
    reserved: [],
    locations: [],
    bonuses: emptyStones(),
    tags: 0,
    points: 0,
  };
}

export function createGame(
  playerCount: number,
  seed: string,
  settings: Partial<GameSettings> = {},
): GameState {
  if (playerCount < 2 || playerCount > 4) {
    throw new Error(`Player count must be 2-4, got ${playerCount}`);
  }
  const rng = createRng(seed);

  const decks = {} as Record<CardLevel, string[]>;
  const market = {} as Record<CardLevel, (string | null)[]>;
  for (const level of [1, 2, 3] as const) {
    const deck = shuffle(
      cardsOfLevel(level).map((c) => c.id),
      rng,
    );
    market[level] = deck.slice(0, MARKET_SLOTS);
    decks[level] = deck.slice(MARKET_SLOTS);
  }

  // One random face from each of `playerCount` random tiles.
  const tiles = shuffle([...new Set(ALL_LOCATIONS.map((l) => l.tile))], rng).slice(0, playerCount);
  const locations = tiles.map((tile) => {
    const faces = ALL_LOCATIONS.filter((l) => l.tile === tile);
    return faces[Math.floor(rng() * faces.length)].id;
  });

  const startingSeat = Math.floor(rng() * playerCount);

  return {
    playerCount,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    seed,
    players: Array.from({ length: playerCount }, (_, i) => makePlayer(i)),
    supply: {
      mind: BASIC_SUPPLY[playerCount],
      space: BASIC_SUPPLY[playerCount],
      soul: BASIC_SUPPLY[playerCount],
      power: BASIC_SUPPLY[playerCount],
      reality: BASIC_SUPPLY[playerCount],
      time: TIME_SUPPLY[playerCount],
      shield: SHIELD_SUPPLY,
    },
    decks,
    market,
    locations,
    avengersHolder: null,
    currentSeat: startingSeat,
    startingSeat,
    moveCount: 0,
    round: 0,
    pending: null,
    endTriggered: false,
    clockExpired: false,
    status: "active",
    winnerSeat: null,
    sharedWinners: null,
  };
}
