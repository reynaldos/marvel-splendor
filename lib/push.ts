/**
 * Push notifications for a new friend request or room invite, to a player whose app is closed.
 * With the app open, the friends channel's toast covers it, so no push goes out.
 */
import { after } from "next/server";
import webpush from "web-push";

import { prisma } from "@/lib/db";
import { userIsOnline } from "@/lib/pusher";

type Db = typeof prisma;

/** At most this many devices per player; a new one pushes out the oldest. */
export const MAX_DEVICES = 5;

export interface PushMessage {
  title: string;
  body: string;
  /** Where a tap opens. */
  url: string;
  /** A repeat with the same tag replaces the last, never stacks. */
  tag: string;
}

/** True when the VAPID keys are set; without them push is off and nothing else changes. */
function configured(): boolean {
  const { NEXT_PUBLIC_VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey, VAPID_SUBJECT: subject } = process.env;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

/** Sends to each of the player's devices, unless their switch is off or the app is open. Never throws. */
export async function pushToUser(userId: string, message: PushMessage, db: Db = prisma): Promise<void> {
  try {
    if (!configured()) return;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { pushEnabled: true, pushSubscriptions: { select: { id: true, endpoint: true, p256dh: true, auth: true } } },
    });
    if (!user?.pushEnabled || user.pushSubscriptions.length === 0) return;
    if (await userIsOnline(userId)) return;
    await Promise.all(
      user.pushSubscriptions.map(async (device) => {
        try {
          await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, JSON.stringify(message), { TTL: 60 * 60 });
        } catch (error) {
          // Gone from the push service: the browser dropped it, so the row goes too.
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await db.pushSubscription.deleteMany({ where: { id: device.id } });
          else console.error("Push failed", error);
        }
      }),
    );
  } catch (error) {
    console.error("pushToUser", error);
  }
}

/** The sender's username, for the notice. */
async function fromName(userId: string, db: Db): Promise<string> {
  return (await db.user.findUnique({ where: { id: userId }, select: { username: true } }))?.username ?? "A friend";
}

/** Pushes a new friend request once the action has answered, so the sender never waits on the push service. */
export function pushFriendRequest(fromUserId: string, toUserId: string, db: Db = prisma) {
  after(async () =>
    pushToUser(toUserId, { title: "Friend request", body: `${await fromName(fromUserId, db)} wants to be your friend`, url: "/friends", tag: `request-${fromUserId}` }, db),
  );
}

/** Pushes a new or resent room invite, after the action has answered. */
export function pushInvite(fromUserId: string, toUserId: string, invite: { id: string; gameId: string; line: string }, db: Db = prisma) {
  after(async () =>
    pushToUser(
      toUserId,
      { title: `${await fromName(fromUserId, db)} invited you to a game`, body: invite.line, url: `/lobby/${invite.gameId}?invite=${invite.id}`, tag: `invite-${invite.id}` },
      db,
    ),
  );
}

/** Keeps this device for the player: one row per endpoint, the newest few per player. */
export async function saveDevice(userId: string, device: { endpoint: string; p256dh: string; auth: string }, db: Db = prisma): Promise<void> {
  const fresh = { userId, p256dh: device.p256dh, auth: device.auth, createdAt: new Date() };
  await db.pushSubscription.upsert({ where: { endpoint: device.endpoint }, create: { endpoint: device.endpoint, ...fresh }, update: fresh });
  const old = await db.pushSubscription.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, skip: MAX_DEVICES, select: { id: true } });
  if (old.length > 0) await db.pushSubscription.deleteMany({ where: { id: { in: old.map((d) => d.id) } } });
}
