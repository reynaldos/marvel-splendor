import { cardLevelsClimbed } from "@/lib/card-level";
import type { OpponentTier } from "@/lib/coins";
import type { BotDifficulty } from "@/lib/engine/types";
import { frameTierFor, type FrameTier } from "@/lib/frame-tier";

/** XP for a card's first level past Recruited; each level after is worth one more, so Recruited to Bronze is 5 and Bronze to Silver 6. */
export const CARD_LEVEL_XP = 5;

/** XP from card levels, given how many times each collected card has been recruited. A Mastered card has given 81. */
export function cardLevelXp(cards: Array<{ cardId: string; times: number }>): number {
  return cards.reduce((xp, c) => {
    const levels = cardLevelsClimbed(c.cardId, c.times);
    return xp + levels * CARD_LEVEL_XP + (levels * (levels - 1)) / 2;
  }, 0);
}

/** What each part of a finished game is worth. A solid win against one normal bot comes to about 40. */
export const GAME_XP = {
  played: 5,
  /** By place at a full table of four. Every shared winner is 1st. */
  place: [20, 10, 5, 2],
  /** Taken off every place for each empty seat, down to the floor. */
  placePerEmptySeat: 5,
  placeMin: 3,
  /** Per opponent at the table, so more and tougher opponents pay more. */
  opponent: { human: 4, hard: 3, normal: 2, easy: 1 } as Record<OpponentTier, number>,
  /** Scales the place XP when every opponent is a bot, averaged over them: 1st against three hard bots is 16. */
  botTable: { hard: 0.8, normal: 0.6, easy: 0.4 } as Record<BotDifficulty, number>,
  /** Per Infinity Point past the game's target, so running up the score pays. */
  pointOverTarget: 3,
  card: 1,
  badge: 1,
  avengersTile: 5,
  location: 3,
  timeStone: 2,
};

/** Place XP for a table of `opponents.length + 1`, scaled down when they are all bots. */
export function placeXp(place: number, opponents: OpponentTier[]): number {
  const base = (GAME_XP.place[place - 1] ?? 0) - GAME_XP.placePerEmptySeat * (GAME_XP.place.length - 1 - opponents.length);
  const botsOnly = opponents.length > 0 && opponents.every((o) => o !== "human");
  const factor = botsOnly ? opponents.reduce((sum, o) => sum + GAME_XP.botTable[o as BotDifficulty], 0) / opponents.length : 1;
  return Math.max(GAME_XP.placeMin, Math.round(base * factor));
}

export interface GameXpInput {
  place: number;
  opponents: OpponentTier[];
  pointsOverTarget: number;
  cards: number;
  /** Avengers badges on the player's cards. */
  badges: number;
  heldAvengersTile: boolean;
  locations: number;
  timeStone: boolean;
}

/** XP one player earned from a finished game. */
export function gameXp(g: GameXpInput): number {
  return (
    GAME_XP.played +
    placeXp(g.place, g.opponents) +
    g.opponents.reduce((xp, o) => xp + GAME_XP.opponent[o], 0) +
    g.pointsOverTarget * GAME_XP.pointOverTarget +
    g.cards * GAME_XP.card +
    g.badges * GAME_XP.badge +
    (g.heldAvengersTile ? GAME_XP.avengersTile : 0) +
    g.locations * GAME_XP.location +
    (g.timeStone ? GAME_XP.timeStone : 0)
  );
}

/** Score needed for `level`: 150×(level−1)^1.7. */
export function scoreForLevel(level: number): number {
  return Math.round(150 * (level - 1) ** 1.7);
}

export function accountLevel(score: number): number {
  let level = 1;
  while (score >= scoreForLevel(level + 1)) level++;
  return level;
}

export const ACCOUNT_FRAME_TIER_MIN_LEVEL = [1, 2, 4, 6, 8, 10, 13, 16, 20, 25];

export function accountFrameTier(level: number): FrameTier {
  return frameTierFor(level, ACCOUNT_FRAME_TIER_MIN_LEVEL);
}

/** The frame tier a player's XP earns them. */
export function accountTierFor(xp: number): FrameTier {
  return accountFrameTier(accountLevel(xp));
}

export interface Progress {
  level: number;
  /** XP into this level, and how much the level spans. */
  into: number;
  span: number;
}

/** Where a score stands: its level, and how far through it, in XP. */
export function progressForScore(score: number): Progress {
  const level = accountLevel(score);
  const from = scoreForLevel(level);
  return { level, into: score - from, span: scoreForLevel(level + 1) - from };
}
