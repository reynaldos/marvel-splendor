import { prisma } from "@/lib/db";
import { PACK_BY_ID } from "@/lib/engine/data";
import { isUniqueViolation } from "@/lib/game-server";
import type { Prisma } from "@/lib/generated/prisma/client";
import { shopItem } from "@/lib/shop";

export type PurchaseResult = { ok: true } | { error: string };

class Refused extends Error {}

/**
 * Buys one item for a player, in one transaction: the purchase row first, which refuses a second
 * copy; then the coins come off, only if they cover the price; then the ledger row that says why.
 */
export async function purchase(userId: string, kind: string, itemId: string, db = prisma): Promise<PurchaseResult> {
  const item = shopItem(kind, itemId);
  if (!item) return { error: "That isn't for sale." };
  try {
    await db.$transaction(async (tx) => {
      await tx.purchase.create({ data: { userId, kind, itemId, price: item.cost } });
      const paid = await tx.userCoins.updateMany({
        where: { userId, balance: { gte: item.cost } },
        data: { balance: { decrement: item.cost } },
      });
      if (paid.count === 0) throw new Refused("Not enough coins.");
      await tx.coinTransaction.create({ data: { userId, delta: -item.cost, reason: `shop:${kind}:${itemId}` } });
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof Refused) return { error: error.message };
    if (isUniqueViolation(error, "itemId")) return { error: "Already owned." };
    throw error;
  }
}

/** The packs any of these players own, sorted, for a game's settings. */
export async function ownedPacks(userIds: string[], db: Prisma.TransactionClient | typeof prisma = prisma): Promise<string[]> {
  if (userIds.length === 0) return [];
  const rows = await db.purchase.findMany({
    where: { userId: { in: userIds }, kind: "pack" },
    select: { itemId: true },
    distinct: ["itemId"],
  });
  return rows
    .map((r) => r.itemId)
    .filter((id) => PACK_BY_ID.has(id))
    .sort();
}
