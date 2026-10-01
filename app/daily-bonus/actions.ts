"use server";

import { refresh } from "next/cache";

import { auth0 } from "@/lib/auth0";
import { claimDailyBonus } from "@/lib/record-daily-bonus";
import { getOrCreateUser } from "@/lib/get-or-create-user";

/** Collects today's daily bonus for the signed-in player and says how much it paid; 0 when there was nothing to collect. */
export async function claimDailyBonusAction(): Promise<number> {
  const session = await auth0.getSession();
  if (!session) return 0;
  const user = await getOrCreateUser(session.user);
  const amount = await claimDailyBonus(user.id);
  if (amount > 0) refresh();
  return amount;
}
