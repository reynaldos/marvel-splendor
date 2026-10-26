/**
 * Pure domain types for the Marvel Splendor engine.
 * No I/O, no framework imports — everything here is JSON-serializable
 * so GameState can be persisted as-is and rehydrated safely.
 */

/** The 5 basic Infinity Stone colors (card costs, bonuses, takeable tokens). */
export const STONES = ["mind", "space", "soul", "power", "reality"] as const;
export type Stone = (typeof STONES)[number];

/** All token colors: 5 basic stones + Time Stone (green) + S.H.I.E.L.D. (gray wildcard). */
export const TOKEN_COLORS = [...STONES, "time", "shield"] as const;
export type TokenColor = (typeof TOKEN_COLORS)[number];

export type TokenCounts = Record<TokenColor, number>;
export type StoneCounts = Record<Stone, number>;

export type CardLevel = 1 | 2 | 3;

export interface Card {
  id: string;
  /** Display name (placeholder dataset — see data/cards.json `_meta.names`). */
  name: string;
  /** Counted by the stats; no part in the rules. "both" counts once as each. */
  side: "hero" | "villain" | "both";
  /** The teams it belongs to, four at most. For the collection page; no part in the rules. */
  groups: string[];
  /** Full-card art path/URL; when absent the UI draws a placeholder card. */
  image?: string;
  level: CardLevel;
  bonus: Stone;
  points: number;
  cost: Partial<StoneCounts>;
  /** Avengers tags (0-2) counting toward the Avengers Assemble tile. */
  tags: number;
}

export interface Location {
  id: string;
  name: string;
  points: number;
  requires: Partial<StoneCounts>;
  /** Full-tile art path/URL; when absent the UI draws a placeholder tile. */
  image?: string;
}

export const BOT_DIFFICULTIES = ["easy", "normal", "hard"] as const;
export type BotDifficulty = (typeof BOT_DIFFICULTIES)[number];

export interface GameSettings {
  /** Per-turn time limit in seconds; null = untimed. */
  turnTimeSeconds: number | null;
  /** Overall game clock in minutes; null = no clock. */
  gameTimeMinutes: number | null;
  /** Infinity Point threshold of the compound win condition (rulebook default 16). */
  targetPoints: number;
  botDifficulty?: BotDifficulty;
  /** When play began, in milliseconds; the game clock runs from here. */
  startedAt?: number;
  /** Overrides botDifficulty for the bot in that seat. */
  botDifficultyBySeat?: Partial<Record<number, BotDifficulty>>;
  /** The card packs dealt in besides the base cards: every pack someone at the table owns. Absent on older games. */
  packs?: string[];
  /** Which game is played: Splendor Duel, or the Marvel game when absent. */
  rules?: "marvel" | "duel";
}

/** A set of cards or Location tiles sold in the shop, dealt only into games where someone owns it. */
export interface Pack {
  id: string;
  title: string;
  description: string;
  cover: string;
  cost: number;
  cards: string[];
  locations?: string[];
  releasedAt: string;
}

export const DEFAULT_SETTINGS: GameSettings = {
  turnTimeSeconds: null,
  gameTimeMinutes: null,
  targetPoints: 16,
};

export function botDifficultyForSeat(settings: GameSettings, seat: number): BotDifficulty {
  return settings.botDifficultyBySeat?.[seat] ?? settings.botDifficulty ?? "normal";
}

export interface ReservedCard {
  cardId: string;
  /** true when blind-reserved from the top of a deck — hidden from opponents. */
  hidden: boolean;
}

export interface PlayerState {
  seat: number;
  tokens: TokenCounts;
  /** Recruited card ids, in recruitment order. */
  cards: string[];
  reserved: ReservedCard[];
  /** Claimed Location tile ids. */
  locations: string[];
  /** Derived caches kept in state for cheap reads/redaction. */
  bonuses: StoneCounts;
  tags: number;
  points: number;
  /** Turns in a row this seat let the clock run out; absent means none. */
  missedTurns?: number;
}

/** Missed turns in a row before a bot plays the seat, until its player comes back. */
export const IDLE_TURNS = 3;

export function isAway(player: { missedTurns?: number }): boolean {
  return (player.missedTurns ?? 0) >= IDLE_TURNS;
}

/** A decision the current player must make before their turn can end. */
export type PendingAction =
  | {
      type: "RETURN_TOKENS";
      mustReturn: number;
      /** What this turn's move took, to put back if the time runs out before the player chooses. */
      taken?: Partial<TokenCounts>;
    }
  | { type: "CHOOSE_LOCATION"; options: string[] };

export type Move =
  | {
      type: "TAKE_TOKENS";
      /** 3 distinct stones, or 2 of one stone (supply >= 4), or fewer when supply forces it. */
      colors: Stone[];
    }
  | { type: "RESERVE"; from: "market"; level: CardLevel; cardId: string }
  | { type: "RESERVE"; from: "deck"; level: CardLevel }
  | { type: "RECRUIT"; from: "market" | "reserve"; cardId: string }
  | { type: "RETURN_TOKENS"; tokens: Partial<TokenCounts> }
  | { type: "CHOOSE_LOCATION"; locationId: string }
  /** Server-initiated: current player timed out; resolves pendings with defaults and passes. */
  | {
      type: "TIMEOUT_SKIP";
      /** Skipped for having no move, not for being late. */
      stuck?: true;
      /** The player was there, with something picked that couldn't be played in time. */
      present?: true;
    }
  /** Server-initiated: game clock expired; finishes the game after the current round. */
  | { type: "END_BY_CLOCK" }
  /** Any seat, any time: that seat loses and the game ends at once. */
  | { type: "FORFEIT" }
  /** A seat taken back from the bot. No longer offered; kept so that games which have one still replay. */
  | { type: "REJOIN" };

export type MoveType = Move["type"];

export interface GameState {
  playerCount: number;
  settings: GameSettings;
  seed: string;
  players: PlayerState[];
  supply: TokenCounts;
  /** Face-down decks per level; index 0 is the top card. */
  decks: Record<CardLevel, string[]>;
  /** 4 face-up slots per level; null = exhausted slot. */
  market: Record<CardLevel, (string | null)[]>;
  /** Location tiles still available to claim. */
  locations: string[];
  /** Seat currently holding the Avengers Assemble tile, if any. */
  avengersHolder: number | null;
  currentSeat: number;
  /** Seat that took the first turn (round boundary reference). */
  startingSeat: number;
  /** Completed move count (each resolved player turn advances this by >= 1). */
  moveCount: number;
  /** Full rounds completed. */
  round: number;
  pending: PendingAction | null;
  /** Set once any player meets the win condition; game ends when the round completes. */
  endTriggered: boolean;
  /** Set by END_BY_CLOCK: finish the current round, then finalize regardless of qualification. */
  clockExpired: boolean;
  status: "active" | "finished";
  winnerSeat: number | null;
  /** Seats sharing victory when the tiebreak ends in a true tie. */
  sharedWinners: number[] | null;
}

/** Points awarded by the Avengers Assemble tile and each Location tile. */
export const AVENGERS_TILE_POINTS = 3;
export const TAGS_TO_CLAIM_AVENGERS = 3;
export const HAND_LIMIT = 10;
export const MAX_RESERVED = 3;
export const MARKET_SLOTS = 4;

export function emptyTokens(): TokenCounts {
  return { mind: 0, space: 0, soul: 0, power: 0, reality: 0, time: 0, shield: 0 };
}

export function emptyStones(): StoneCounts {
  return { mind: 0, space: 0, soul: 0, power: 0, reality: 0 };
}

export function totalTokens(t: TokenCounts): number {
  return TOKEN_COLORS.reduce((sum, c) => sum + t[c], 0);
}
