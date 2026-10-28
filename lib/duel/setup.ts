/** Deals a new Duel game from a seed: the bag onto the board, the decks and pyramid, the Royals, one Privilege to the second player. */
import { locationPool } from "@/lib/engine/data";
import { createRng, shuffle } from "@/lib/engine/rng";
import { DEFAULT_SETTINGS, emptyTokens } from "@/lib/engine/types";

import { refill } from "./board";
import { duelCardsOfLevel, ROYAL_CARDS } from "./data";
import {
  BAG_COUNTS,
  BOARD_SPACES,
  PRIVILEGES,
  PYRAMID_SLOTS,
  TOKEN_COLORS,
  type CardLevel,
  type DuelPlayer,
  type DuelState,
  type GameSettings,
  type RoyalTiles,
  type TokenColor,
} from "./types";

/** The Royals' pictures: four Location tiles with art, dealt from the base tiles and the packs given, on a seed of their own so the deal of the cards stays as it was. */
function dealRoyalTiles(seed: string, packs: readonly string[] = []): RoyalTiles {
  const tiles = shuffle(locationPool(packs).filter((l) => l.image).map((l) => l.id), createRng(`${seed}:royals`));
  return Object.fromEntries(ROYAL_CARDS.map((r, i) => [r.id, tiles[i % tiles.length]]));
}

function player(seat: number): DuelPlayer {
  return { seat, tokens: emptyTokens(), cards: [], reserved: [], privileges: 0, royals: [] };
}

export function createDuel(seed: string, settings: Partial<GameSettings> = {}): DuelState {
  const rng = createRng(seed);
  const cardsOf = (level: CardLevel) => duelCardsOfLevel(level, settings.cardSet, settings.packs);

  const bag: TokenColor[] = shuffle(
    TOKEN_COLORS.flatMap((t) => Array<TokenColor>(BAG_COUNTS[t]).fill(t)),
    rng,
  );
  const { board, bag: left } = refill({ board: Array<TokenColor | null>(BOARD_SPACES).fill(null), bag });

  const decks = {} as Record<CardLevel, string[]>;
  const pyramid = {} as Record<CardLevel, (string | null)[]>;
  for (const level of [1, 2, 3] as const) {
    const deck = shuffle(cardsOf(level).map((c) => c.id), rng);
    pyramid[level] = deck.slice(0, PYRAMID_SLOTS[level]);
    decks[level] = deck.slice(PYRAMID_SLOTS[level]);
  }

  const startingSeat = Math.floor(rng() * 2);
  const players: [DuelPlayer, DuelPlayer] = [player(0), player(1)];
  // The player who does not go first starts with a Privilege.
  players[1 - startingSeat].privileges = 1;

  return {
    rules: "duel",
    settings: { ...DEFAULT_SETTINGS, ...settings },
    seed,
    players,
    board,
    bag: left,
    decks,
    pyramid,
    royals: ROYAL_CARDS.map((r) => r.id),
    ...(settings.cardSet === "marvel" ? { royalTiles: dealRoyalTiles(seed, settings.packs) } : {}),
    privileges: PRIVILEGES - 1,
    currentSeat: startingSeat,
    startingSeat,
    refilled: false,
    extraTurn: false,
    pending: null,
    moveCount: 0,
    status: "active",
    winnerSeat: null,
  };
}
