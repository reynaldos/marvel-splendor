"use server";

import { refresh } from "next/cache";

import { auth0 } from "@/lib/auth0";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { purchase, type PurchaseResult } from "@/lib/record-purchase";

/** Buys an item for the signed-in player; the top bar's coins follow. */
export async function purchaseAction(kind: string, itemId: string): Promise<PurchaseResult> {
  const session = await auth0.getSession();
  if (!session) return { error: "Sign in to buy." };
  const user = await getOrCreateUser(session.user);
  const result = await purchase(user.id, kind, itemId);
  if ("ok" in result) refresh();
  return result;
}
