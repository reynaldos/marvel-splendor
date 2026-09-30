import { prisma } from "@/lib/db";
import { cardLevelXp } from "@/lib/xp";

/** Each player's XP from card levels, read from their collection. A player with no cards is left out. */
export async function cardLevelXpByUser(userIds: string[]): Promise<Map<string, number>> {
  const cards = await prisma.collectedCard.findMany({ where: { userId: { in: userIds } }, select: { userId: true, times: true } });
  const xp = new Map<string, number>();
  for (const { userId, times } of cards) xp.set(userId, (xp.get(userId) ?? 0) + cardLevelXp([times]));
  return xp;
}
