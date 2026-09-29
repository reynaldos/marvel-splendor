import { headers } from "next/headers";
import { after } from "next/server";

import { prisma } from "@/lib/db";

/** A gap this long between requests starts a new visit. */
export const VISIT_GAP_MS = 30 * 60 * 1000;
const WRITE_EVERY_MS = 60 * 1000;
const MAX_USER_AGENT_LENGTH = 255;

// ponytail: kept in memory, so the limit is per server instance; move to the database if writes ever load it
const lastWrite = new Map<string, number>();

/** The first address in the list is the visitor's; the rest are proxies. */
export function clientIp(requestHeaders: Headers): string | null {
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0].trim();
  return forwarded || requestHeaders.get("x-real-ip") || null;
}

async function saveVisit(userId: string, ip: string | null, userAgent: string | null) {
  const now = new Date();
  // ponytail: two first requests at once can open two visits; add a lock if the counts need to be exact
  const { count } = await prisma.userVisit.updateMany({
    where: { userId, ip, lastSeenAt: { gte: new Date(now.getTime() - VISIT_GAP_MS) } },
    data: { lastSeenAt: now },
  });
  if (count === 0) await prisma.userVisit.create({ data: { userId, ip, userAgent } });
}

/** Notes that the user is active, at most once a minute. Never fails the request it is called from. */
export async function recordVisit(userId: string): Promise<void> {
  const now = Date.now();
  if (now - (lastWrite.get(userId) ?? 0) < WRITE_EVERY_MS) return;
  lastWrite.set(userId, now);

  try {
    const requestHeaders = await headers();
    const ip = clientIp(requestHeaders);
    const userAgent = requestHeaders.get("user-agent")?.slice(0, MAX_USER_AGENT_LENGTH) ?? null;
    // Saved once the response has gone out, so it never slows a page or a move.
    after(() => saveVisit(userId, ip, userAgent).catch((error) => console.error("recordVisit", error)));
  } catch (error) {
    console.error("recordVisit", error);
  }
}
