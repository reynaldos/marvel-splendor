import { prisma } from "@/lib/db";
import type { GameRewards } from "@/lib/game-record";
import { Prisma } from "@/lib/generated/prisma/client";

/** Each player's account XP: what every finished game gave them, read from the rewards saved on their seats. A player with none is left out. */
export async function accountXpByUser(userIds: string[]): Promise<Map<string, number>> {
  const xp = new Map<string, number>();
  if (userIds.length === 0) return xp;
  const seats = await prisma.gamePlayer.findMany({
    where: { userId: { in: userIds }, rewards: { not: Prisma.DbNull } },
    select: { userId: true, rewards: true },
  });
  for (const { userId, rewards } of seats) {
    const { before, after } = (rewards as unknown as GameRewards).xp;
    xp.set(userId!, (xp.get(userId!) ?? 0) + after - before);
  }
  return xp;
}
