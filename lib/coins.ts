import { botDifficultyForSeat, type BotDifficulty, type GameSettings } from "@/lib/engine/types";

export type OpponentTier = "human" | BotDifficulty;

const PAYOUT: Record<OpponentTier, { win: number; loss: number }> = {
  human: { win: 50, loss: 20 },
  hard: { win: 30, loss: 12 },
  normal: { win: 18, loss: 7 },
  easy: { win: 10, loss: 4 },
};

/** A game must reach this many turns for a player before it pays out — blocks an instant-forfeit farm loop. */
const MIN_TURNS_TO_PAY = 4;

/** Daily cap on coins from bot games only — bots are free and instant to spin up; human games are naturally rate-limited. */
export const BOT_COINS_DAILY_CAP = 150;

const BOT_DIFFICULTY_RANK: Record<BotDifficulty, number> = { easy: 0, normal: 1, hard: 2 };

/** The toughest opponent actually facing `seat` — a bot-filled seat elsewhere doesn't count once a real opponent is present. */
export function opponentTierFor(
  settings: GameSettings,
  seat: number,
  players: Array<{ seat: number; isBot: boolean }>,
): OpponentTier {
  const opponents = players.filter((p) => p.seat !== seat);
  if (opponents.some((p) => !p.isBot)) return "human";

  return opponents.reduce<BotDifficulty>((toughest, p) => {
    const difficulty = botDifficultyForSeat(settings, p.seat);
    return BOT_DIFFICULTY_RANK[difficulty] > BOT_DIFFICULTY_RANK[toughest] ? difficulty : toughest;
  }, "easy");
}

/** Coins for one player's finished-game outcome; 0 if it didn't reach the minimum turns to pay out. */
export function coinsForOutcome(tier: OpponentTier, isWinner: boolean, turns: number): number {
  if (turns < MIN_TURNS_TO_PAY) return 0;
  return isWinner ? PAYOUT[tier].win : PAYOUT[tier].loss;
}
