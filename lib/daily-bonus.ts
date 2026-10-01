/** Coins for each day of the streak. Day 8 is the prize; the next day starts over at Day 1. */
export const DAILY_BONUS = [10, 15, 20, 25, 30, 40, 50, 100];

const DAY_MS = 86_400_000;
/** Ledger reason for a claim, with the streak day after the colon. */
export const DAILY_BONUS_REASON = "daily:";

export interface DailyBonusState {
  /** The day to collect, or the day collected today. 1 to 8. */
  day: number;
  claimable: boolean;
  /** When the next claim opens, in ms, while today's is collected. */
  unlocksAt: number | null;
}

export interface DailyClaim {
  day: number;
  at: Date;
}

const startOfUtcDay = (at: Date) => Math.floor(at.getTime() / DAY_MS) * DAY_MS;

/** Where the streak stands: collected today, next day up after yesterday's, or back to Day 1. */
export function dailyBonusState(last: DailyClaim | null, now = new Date()): DailyBonusState {
  const today = startOfUtcDay(now);
  if (last && last.at.getTime() >= today) return { day: last.day, claimable: false, unlocksAt: today + DAY_MS };
  const streak = last !== null && last.at.getTime() >= today - DAY_MS;
  return { day: streak ? (last.day % DAILY_BONUS.length) + 1 : 1, claimable: true, unlocksAt: null };
}
