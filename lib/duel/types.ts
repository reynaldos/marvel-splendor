/**
 * Splendor Duel's state, moves and pending choices. Pure data: the engine in
 * this folder reads and returns it, nothing here touches a database or React.
 * The stones, tokens and settings are the Marvel game's; Pearls are the Time
 * stone and Gold is the S.H.I.E.L.D. token.
 */
import type { CardLevel, GameSettings, Stone, TokenColor, TokenCounts } from "@/lib/engine/types";

export { STONES, TOKEN_COLORS, emptyTokens, totalTokens } from "@/lib/engine/types";
export type { CardLevel, GameSettings, Stone, StoneCounts, TokenColor, TokenCounts } from "@/lib/engine/types";

/** The six tokens in the bag, by the names the Marvel board uses: Pearls are "time", Gold is "shield". */
export const PEARL = "time";
export const GOLD = "shield";
/** The bag: 4 of each stone, 2 Pearls, 3 Gold. */
export const BAG_COUNTS: TokenCounts = { mind: 4, space: 4, soul: 4, power: 4, reality: 4, time: 2, shield: 3 };
export const BOARD_SPACES = 25;
export const PYRAMID_SLOTS: Record<CardLevel, number> = { 1: 5, 2: 4, 3: 3 };
export const PRIVILEGES = 3;
export const MAX_RESERVED = 3;
export const HAND_LIMIT = 10;
/** The wins: points in all, crowns, or points on cards of one color. Any one ends the game at once. */
export const WIN_POINTS = 20;
export const WIN_CROWNS = 10;
export const WIN_COLOR_POINTS = 10;
/** A Royal card comes at this many crowns, and another at twice it. */
export const ROYAL_CROWNS = 3;

export type Ability = "again" | "wild" | "token" | "privilege" | "steal";

/** A Jewel card as `data/duel/cards.json` has it. */
export interface DuelCard {
  id: string;
  level: CardLevel;
  points: number;
  crowns: number;
  /** A stone; "wild" joins a color you own when bought; null is no bonus at all. */
  bonus: Stone | "wild" | null;
  /** 1 for most; 2 for the five cards that count twice; 0 with no bonus. */
  bonusCount: number;
  ability: Ability | null;
  cost: Partial<TokenCounts>;
}

export interface RoyalCard {
  id: string;
  points: number;
  ability: Ability | null;
}

/** A card a player owns: a wild card remembers the color it joined. */
export interface OwnedCard {
  cardId: string;
  joined?: Stone;
}

export interface DuelPlayer {
  seat: number;
  tokens: TokenCounts;
  cards: OwnedCard[];
  /** Hidden from the opponent; `blind` was taken from the top of a deck unseen. */
  reserved: { cardId: string; blind: boolean }[];
  privileges: number;
  royals: string[];
  /** Turns missed in a row, as the Marvel engine counts them. */
  missedTurns?: number;
}

/** A choice the turn is waiting on before it can end. */
export type DuelPending =
  /** A power or a spent Privilege: take any one token on the board (no Gold), or one of a color for the token power. */
  | { type: "PICK_TOKEN"; color?: Stone; reason: "privilege" | "token" }
  /** The steal power: take one of the opponent's tokens, not Gold. */
  | { type: "PICK_OPPONENT_TOKEN" }
  /** A wild card bought: which color it joins. */
  | { type: "PICK_JOIN_COLOR"; cardId: string }
  /** Crowns reached: which Royal card. */
  | { type: "PICK_ROYAL" }
  /** Over the hand limit at the end of the turn. */
  | { type: "RETURN_TOKENS"; mustReturn: number };

export interface DuelState {
  rules: "duel";
  settings: GameSettings;
  seed: string;
  players: [DuelPlayer, DuelPlayer];
  /** The 25 spaces in spiral order, from the middle out; null is empty. */
  board: (TokenColor | null)[];
  /** Tokens waiting to be dealt, in the order they will come out. Hidden from the view. */
  bag: TokenColor[];
  decks: Record<CardLevel, string[]>;
  pyramid: Record<CardLevel, (string | null)[]>;
  royals: string[];
  /** Privilege scrolls still on the table. */
  privileges: number;
  currentSeat: number;
  startingSeat: number;
  /** The player has refilled this turn, so may not again. */
  refilled: boolean;
  /** The again power: the same player goes again when this turn ends. */
  extraTurn: boolean;
  pending: DuelPending | null;
  moveCount: number;
  status: "active" | "finished";
  winnerSeat: number | null;
  /** The game clock has run out: the game ends once both have had the same number of turns. */
  clockExpired?: boolean;
}

export type DuelMove =
  | { type: "SPEND_PRIVILEGE" }
  | { type: "REFILL" }
  /** Up to three spaces in a straight, unbroken line, in board order. */
  | { type: "TAKE_LINE"; spaces: number[] }
  | { type: "RESERVE"; from: "pyramid"; cardId: string }
  | { type: "RESERVE"; from: "deck"; level: CardLevel }
  | { type: "BUY"; cardId: string }
  | { type: "PICK_TOKEN"; space: number }
  | { type: "PICK_OPPONENT_TOKEN"; color: TokenColor }
  | { type: "PICK_JOIN_COLOR"; color: Stone }
  | { type: "PICK_ROYAL"; royalId: string }
  | { type: "RETURN_TOKENS"; tokens: Partial<TokenCounts> }
  | { type: "TIMEOUT_SKIP"; present?: boolean; stuck?: boolean }
  | { type: "FORFEIT" }
  /** The server's: the game clock ran out. */
  | { type: "END_BY_CLOCK" };
