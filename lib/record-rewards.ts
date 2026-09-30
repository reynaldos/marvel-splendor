import { cardFrameTier } from "@/lib/card-level";
import { prisma } from "@/lib/db";
import type { GameRewards } from "@/lib/game-record";
import { Prisma } from "@/lib/generated/prisma/client";
import type { UserStatsSnapshot } from "@/lib/record-stats";
import type { CardCountChange } from "@/lib/save-collection";
import { accountScore, cardLevelXp } from "@/lib/xp";

export interface RewardSources {
  stats: Array<{ userId: string; prev: UserStatsSnapshot; next: UserStatsSnapshot }>;
  rating: Array<{ userId: string; before: number; after: number }>;
  coins: Map<string, number>;
  /** Each player's XP from card levels before this game's cards were added. */
  cardXpBefore: Map<string, number>;
  cards: CardCountChange[];
}

/** One player's rewards, put together from what each recorder said it changed. Null when their stats weren't recorded. */
export function buildGameRewards(userId: string, from: RewardSources): GameRewards | null {
  const stats = from.stats.find((s) => s.userId === userId);
  if (!stats) return null;

  const cards = from.cards.filter((c) => c.userId === userId);
  const xpBefore = from.cardXpBefore.get(userId) ?? 0;
  const xpAfter = xpBefore + cardLevelXp(cards.map((c) => c.after)) - cardLevelXp(cards.map((c) => c.before));
  const rating = from.rating.find((r) => r.userId === userId);

  return {
    ...(rating ? { rating: { before: rating.before, after: rating.after } } : {}),
    coins: from.coins.get(userId) ?? 0,
    xp: { before: accountScore(stats.prev, xpBefore), after: accountScore(stats.next, xpAfter) },
    cardLevelUps: cards
      .map((c) => ({ cardId: c.cardId, from: cardFrameTier(c.before), to: cardFrameTier(c.after) }))
      .filter((c) => c.from !== c.to),
  };
}

/** Saves each human player's rewards on their seat, so the results can show them any time. */
export async function recordGameRewards(
  gameId: string,
  players: Array<{ seat: number; userId: string | null; isBot: boolean }>,
  from: RewardSources,
): Promise<void> {
  await Promise.all(
    players
      .filter((p) => !p.isBot && p.userId)
      .map((p) => ({ seat: p.seat, rewards: buildGameRewards(p.userId!, from) }))
      .filter((p) => p.rewards)
      .map((p) =>
        prisma.gamePlayer.update({
          where: { gameId_seat: { gameId, seat: p.seat } },
          data: { rewards: p.rewards as unknown as Prisma.InputJsonValue },
        }),
      ),
  );
}
