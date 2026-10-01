import { DAILY_BONUS, DAILY_BONUS_REASON, dailyBonusState, type DailyClaim } from "@/lib/daily-bonus";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function lastDailyClaim(userId: string, db: Prisma.TransactionClient = prisma): Promise<DailyClaim | null> {
  const row = await db.coinTransaction.findFirst({
    where: { userId, reason: { startsWith: DAILY_BONUS_REASON } },
    orderBy: { createdAt: "desc" },
    select: { reason: true, createdAt: true },
  });
  return row && { day: Number(row.reason.slice(DAILY_BONUS_REASON.length)), at: row.createdAt };
}

/** Pays today's bonus into the ledger and the balance; 0 when today's is already collected. */
export async function claimDailyBonus(userId: string, now = new Date()): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const state = dailyBonusState(await lastDailyClaim(userId, tx), now);
    if (!state.claimable) return 0;
    const amount = DAILY_BONUS[state.day - 1];
    await tx.coinTransaction.create({ data: { userId, delta: amount, reason: `${DAILY_BONUS_REASON}${state.day}`, createdAt: now } });
    await tx.userCoins.upsert({ where: { userId }, create: { userId, balance: amount }, update: { balance: { increment: amount } } });
    return amount;
  });
}
