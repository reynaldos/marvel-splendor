import { prisma } from "@/lib/db";
import { BOT_COINS_DAILY_CAP, coinsForOutcome, opponentTierFor, type OpponentTier } from "@/lib/coins";
import type { GameSettings } from "@/lib/engine/types";

export type FinishedGameCoinOutcome = { userId: string; seat: number; isWinner: boolean; turns: number };

function reasonFor(tier: OpponentTier, isWinner: boolean): string {
  return `game:${tier}:${isWinner ? "win" : "loss"}`;
}

function startOfToday(): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/** Awards coins for every human outcome in a finished game, transactionally, and says who got how many. Caller excludes bots. */
export async function recordGameCoins(
  gameId: string,
  settings: GameSettings,
  players: Array<{ seat: number; isBot: boolean }>,
  outcomes: FinishedGameCoinOutcome[],
): Promise<Map<string, number>> {
  const awarded = new Map<string, number>();
  if (outcomes.length === 0) return awarded;

  await prisma.$transaction(async (tx) => {
    for (const outcome of outcomes) {
      const tier = opponentTierFor(settings, outcome.seat, players);
      let amount = coinsForOutcome(tier, outcome.isWinner, outcome.turns);
      if (amount === 0) continue;

      if (tier !== "human") {
        const earnedToday = await tx.coinTransaction.aggregate({
          where: { userId: outcome.userId, reason: { startsWith: "game:", not: { startsWith: "game:human:" } }, createdAt: { gte: startOfToday() } },
          _sum: { delta: true },
        });
        amount = Math.max(0, Math.min(amount, BOT_COINS_DAILY_CAP - (earnedToday._sum.delta ?? 0)));
        if (amount === 0) continue;
      }

      await tx.coinTransaction.create({
        data: { userId: outcome.userId, delta: amount, reason: reasonFor(tier, outcome.isWinner), gameId },
      });

      await tx.userCoins.upsert({
        where: { userId: outcome.userId },
        create: { userId: outcome.userId, balance: amount },
        update: { balance: { increment: amount } },
      });
      awarded.set(outcome.userId, amount);
    }
  });
  return awarded;
}
