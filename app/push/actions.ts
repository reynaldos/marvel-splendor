"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { saveDevice } from "@/lib/push";

/** What `PushSubscription.toJSON()` gives in the browser; only these parts are kept. */
const deviceSchema = z.object({
  endpoint: z.url().max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

async function signedInUser() {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/settings");
  return getOrCreateUser(session.user);
}

/** Keeps this device for the signed-in player, so their requests and invites reach it. */
export async function savePushDeviceAction(subscription: unknown): Promise<{ ok: true } | { error: string }> {
  const user = await signedInUser();
  const device = deviceSchema.safeParse(subscription);
  if (!device.success) return { error: "That device can't take notifications." };
  try {
    await saveDevice(user.id, { endpoint: device.data.endpoint, ...device.data.keys });
  } catch (error) {
    console.error("savePushDeviceAction", error);
    return { error: "The server couldn't keep this device." };
  }
  return { ok: true };
}

/** The account's Notifications switch: off stops every push to every device. */
export async function setPushEnabledAction(on: boolean): Promise<void> {
  const user = await signedInUser();
  if (typeof on !== "boolean") return;
  await prisma.user.update({ where: { id: user.id }, data: { pushEnabled: on } });
}
