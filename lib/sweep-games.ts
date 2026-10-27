import { prisma } from "@/lib/db";

const HOUR_MS = 60 * 60 * 1000;
/** A multiplayer game or a lobby nobody has touched for this long is dead. */
export const IDLE_TABLE_MS = 24 * HOUR_MS;
/** A game against bots can be paused and come back to, so it gets a week. */
export const IDLE_BOT_GAME_MS = 7 * 24 * HOUR_MS;

/** Closes the games left open past their idle time as abandoned, and says how many. Nothing runs on the server between requests, so this is called by the cron and the admin. */
export async function sweepDeadGames(now = Date.now()): Promise<number> {
  const { count } = await prisma.game.updateMany({
    where: {
      OR: [
        { status: "LOBBY", updatedAt: { lt: new Date(now - IDLE_TABLE_MS) } },
        { status: "ACTIVE", mode: "MULTIPLAYER", updatedAt: { lt: new Date(now - IDLE_TABLE_MS) } },
        { status: "ACTIVE", mode: "VS_BOT", updatedAt: { lt: new Date(now - IDLE_BOT_GAME_MS) } },
      ],
    },
    data: { status: "ABANDONED" },
  });
  return count;
}
