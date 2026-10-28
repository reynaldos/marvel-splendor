import { prisma } from "@/lib/db";
import { playsBotsOnly } from "@/lib/lobby-rules";

const HOUR_MS = 60 * 60 * 1000;
/** A game or a lobby nobody has touched for this long is dead. */
export const IDLE_TABLE_MS = 24 * HOUR_MS;
/** A game one person plays against bots can be paused and come back to, so it gets a week. */
export const IDLE_BOT_GAME_MS = 7 * 24 * HOUR_MS;

/** Whether the sweep closes this game now. */
export function isDead(game: { status: string; updatedAt: Date; players: Array<{ isBot: boolean }> }, now: number): boolean {
  if (game.status !== "LOBBY" && game.status !== "ACTIVE") return false;
  const limit = game.status === "ACTIVE" && playsBotsOnly(game.players) ? IDLE_BOT_GAME_MS : IDLE_TABLE_MS;
  return now - game.updatedAt.getTime() > limit;
}

/** Closes the games left open past their idle time as abandoned, and says how many. Nothing runs on the server between requests, so this is called by the cron and the admin. */
export async function sweepDeadGames(now = Date.now()): Promise<number> {
  const idle = await prisma.game.findMany({
    where: { status: { in: ["LOBBY", "ACTIVE"] }, updatedAt: { lt: new Date(now - IDLE_TABLE_MS) } },
    select: { id: true, status: true, updatedAt: true, players: { select: { isBot: true } } },
  });
  const dead = idle.filter((g) => isDead(g, now)).map((g) => g.id);
  if (dead.length === 0) return 0;
  const { count } = await prisma.game.updateMany({ where: { id: { in: dead } }, data: { status: "ABANDONED" } });
  return count;
}
