import { EMOJIS, MESSAGES } from "@/lib/chat";
import { prisma } from "@/lib/db";
import { shopItem } from "@/lib/shop";
import type { GameSettings, GameState } from "@/lib/engine/types";
import { rankable, type AnyState } from "@/lib/game-rules";
import { rankPlayers } from "@/lib/game-record";
import type { GameSummary } from "@/lib/game-summary";
import { botName } from "@/lib/lobby-rules";
import { IDLE_BOT_GAME_MS, IDLE_TABLE_MS } from "@/lib/sweep-games";

/** Visits are written at most once a minute, so anyone seen this recently is still here. */
const ONLINE_MS = 5 * 60 * 1000;
/** A game nobody has moved in for this long is open but not being played. */
const LIVE_GAME_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const TABLES_SHOWN = 50;
// ponytail: the latest 200 finished games, paged in the browser. Page on the server if the list outgrows it.
const RECENT_SHOWN = 200;

const SIGN_IN: Record<string, string> = {
  auth0: "Email",
  email: "Email link",
  "google-oauth2": "Google",
  apple: "Apple",
  facebook: "Facebook",
  github: "GitHub",
};

/** The part of the sign-in id before the bar names how they signed in. */
export function signInMethod(auth0Sub: string): string {
  const provider = auth0Sub.split("|")[0];
  return SIGN_IN[provider] ?? provider;
}

// ponytail: a few patterns, not a full parser; use a library if the split by device ever has to be exact
const DEVICES: Array<[RegExp, string]> = [
  [/iPhone/, "iPhone"],
  [/iPad/, "iPad"],
  [/Android/, "Android"],
  [/Macintosh/, "Mac"],
  [/Windows/, "Windows"],
  [/Linux/, "Linux"],
];
// Chrome names Safari too, and Edge names both, so the order matters.
const BROWSERS: Array<[RegExp, string]> = [
  [/Edg/, "Edge"],
  [/Firefox|FxiOS/, "Firefox"],
  [/Chrome|CriOS/, "Chrome"],
  [/Safari/, "Safari"],
];

/** "iPhone, Safari". */
export function deviceName(userAgent: string | null): string {
  if (!userAgent) return "Unknown";
  const named = (list: Array<[RegExp, string]>) => list.find(([pattern]) => pattern.test(userAgent))?.[1] ?? "Other";
  return `${named(DEVICES)}, ${named(BROWSERS)}`;
}

/** "45m", "3h 12m". */

export interface Visit {
  ip: string | null;
  userAgent: string | null;
  startedAt: Date;
  lastSeenAt: Date;
}

/** Takes the visits latest first. */
export function summarizeVisits(visits: Visit[]) {
  return {
    count: visits.length,
    lastSeenAt: visits[0]?.lastSeenAt ?? null,
    lastJoinedAt: visits[0]?.startedAt ?? null,
    timeInAppMs: visits.reduce((sum, v) => sum + v.lastSeenAt.getTime() - v.startedAt.getTime(), 0),
    /** Every address used, latest first. */
    ips: [...new Set(visits.flatMap((v) => v.ip ?? []))],
    device: deviceName(visits[0]?.userAgent ?? null),
  };
}

/** Most sent first, for what is on the list now: never sent shows 0, and anything taken off the list is left out. */
export function rankSends(list: readonly string[], sent: Array<{ body: string; count: number }>) {
  return list
    .map((body) => ({ body, count: sent.find((s) => s.body === body)?.count ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

const GAME_SELECT = {
  id: true,
  joinCode: true,
  status: true,
  mode: true,
  createdAt: true,
  updatedAt: true,
  state: true,
  settings: true,
  _count: { select: { moves: true } },
  players: {
    orderBy: { seat: "asc" as const },
    select: { seat: true, isBot: true, guestName: true, user: { select: { username: true } } },
  },
};

/**
 * Everything the admin page shows: who is here now, the open tables, and every user.
 *
 * ponytail: reads every user and every visit on each load. Page the users and
 * add the visits up in the database once there are thousands.
 */
export async function loadUserMetrics(now = Date.now()) {
  const [users, moveTimes, gameCounts, openGames, recentGames, sends] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        auth0Sub: true,
        createdAt: true,
        stats: { select: { wins: true } },
        coins: { select: { balance: true } },
        purchases: { orderBy: { createdAt: "desc" }, select: { kind: true, itemId: true, price: true, createdAt: true } },
        visits: {
          orderBy: { lastSeenAt: "desc" },
          select: { ip: true, userAgent: true, startedAt: true, lastSeenAt: true },
        },
        players: { select: { gameId: true, game: { select: { status: true } } } },
      },
    }),
    prisma.move.groupBy({ by: ["gameId"], _min: { createdAt: true }, _max: { createdAt: true } }),
    prisma.game.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.game.findMany({
      where: { status: { in: ["ACTIVE", "LOBBY"] } },
      orderBy: { updatedAt: "desc" },
      take: TABLES_SHOWN,
      select: GAME_SELECT,
    }),
    prisma.game.findMany({
      where: { status: { in: ["FINISHED", "ABANDONED"] } },
      orderBy: { updatedAt: "desc" },
      take: RECENT_SHOWN,
      select: GAME_SELECT,
    }),
    prisma.chatMessage.groupBy({ by: ["kind", "body"], _count: { _all: true } }),
  ]);

  // A game is timed from its first move to its last, so waiting in a lobby or an open tab adds nothing.
  const playedMs = new Map(
    moveTimes.map((g) => [g.gameId, (g._max.createdAt?.getTime() ?? 0) - (g._min.createdAt?.getTime() ?? 0)]),
  );
  const sentOf = (kind: string) =>
    sends.filter((s) => s.kind === kind).map((s) => ({ body: s.body, count: s._count._all }));
  const gamesWith = (status: string) => gameCounts.find((g) => g.status === status)?._count._all ?? 0;

  const rows = users
    .map((user) => {
      const visits = summarizeVisits(user.visits);
      const games = (status: string) => user.players.filter((p) => p.game.status === status).length;
      return {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        signIn: signInMethod(user.auth0Sub),
        signedUpAt: user.createdAt,
        ...visits,
        online: visits.lastSeenAt !== null && now - visits.lastSeenAt.getTime() < ONLINE_MS,
        playingMs: user.players.reduce((sum, p) => sum + (playedMs.get(p.gameId) ?? 0), 0),
        finished: games("FINISHED"),
        abandoned: games("ABANDONED"),
        inPlay: games("ACTIVE"),
        wins: user.stats?.wins ?? 0,
        coins: user.coins?.balance ?? 0,
        purchases: user.purchases.map((p) => ({ ...p, title: shopItem(p.kind, p.itemId)?.title ?? p.itemId })),
      };
    })
    // Latest seen first; those never seen since tracking began go last.
    .sort((a, b) => (b.lastSeenAt?.getTime() ?? 0) - (a.lastSeenAt?.getTime() ?? 0));

  const summarize = (game: (typeof openGames)[number]): GameSummary => {
    const state = game.state as unknown as Partial<GameState> | null;
    const settings = game.settings as unknown as Partial<GameSettings> | null;
    const seated = game.players.map((p) => ({
      seat: p.seat,
      name: p.isBot ? botName(game.players, p.seat) : (p.user?.username ?? p.guestName ?? "Player"),
      avatarUrl: null,
    }));
    return {
      id: game.id,
      status: game.status,
      mode: game.mode,
      joinCode: game.joinCode,
      createdAt: game.createdAt.getTime(),
      updatedAt: game.updatedAt.getTime(),
      playedMs: playedMs.get(game.id) ?? 0,
      live: game.status === "ACTIVE" && now - game.updatedAt.getTime() < LIVE_GAME_MS,
      dead: game.status !== "FINISHED" && game.status !== "ABANDONED" && now - game.updatedAt.getTime() > (game.mode === "VS_BOT" && game.status === "ACTIVE" ? IDLE_BOT_GAME_MS : IDLE_TABLE_MS),
      round: state?.round ?? 0,
      moves: game._count.moves,
      players: seated.map((p) => p.name),
      rules: { targetPoints: settings?.targetPoints ?? 0, turnTimeSeconds: settings?.turnTimeSeconds ?? null },
      standings: state?.players ? rankPlayers(rankable(state as AnyState), seated) : null,
    };
  };
  const tables = openGames.map(summarize);
  const recent = recentGames.map(summarize);

  return {
    totals: {
      users: users.length,
      online: rows.filter((r) => r.online).length,
      newThisWeek: users.filter((u) => now - u.createdAt.getTime() < 7 * DAY_MS).length,
      visitsToday: users.flatMap((u) => u.visits).filter((v) => now - v.startedAt.getTime() < DAY_MS).length,
      liveGames: tables.filter((t) => t.live).length,
      openGames: gamesWith("ACTIVE"),
      lobbies: gamesWith("LOBBY"),
      finished: gamesWith("FINISHED"),
      abandoned: gamesWith("ABANDONED"),
    },
    tables,
    recent,
    users: rows,
    // Every purchase ever made, newest first, with who made it.
    purchases: rows
      .flatMap((r) => r.purchases.map((p) => ({ ...p, username: r.username, name: r.name })))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    sent: {
      emojis: rankSends(EMOJIS, sentOf("REACTION")),
      messages: rankSends(MESSAGES, sentOf("TEXT")),
    },
  };
}
