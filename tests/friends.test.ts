import { beforeEach, describe, expect, it, vi } from "vitest";

// lib/friends.ts pulls in Prisma at import time; every test here hands it a fake db instead.
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/generated/prisma/client", () => ({ Prisma: {} }));
vi.mock("@/lib/r2", () => ({ publicAvatarUrl: (key: string | null) => (key ? `https://img/${key}` : null) }));

import { FRIEND_MESSAGES, MAX_FRIENDS, MAX_PENDING_SENT, MAX_REQUESTS_PER_DAY, NOT_FOUND, ONLINE_WINDOW_MS, REQUEST_WINDOW_MS } from "@/lib/friend-rules";
import {
  blockPlayer,
  cancelFriendRequest,
  loadFriends,
  removeFriend,
  respondFriendRequest,
  sendFriendRequest,
  standingWith,
  unblockPlayer,
  waitingRequestCount,
} from "@/lib/friends";

type Row = Record<string, unknown>;
type Where = Record<string, unknown>;

/** Does a row match a Prisma-style where: equality, `{ in }`, `{ gte }`, `OR`, and the compound-unique keys this code uses. */
function matches(row: Row, where: Where): boolean {
  return Object.entries(where).every(([key, want]) => {
    if (key === "OR") return (want as Where[]).some((w) => matches(row, w));
    if (key === "fromUserId_toUserId" || key === "userId_friendId") return matches(row, want as Where);
    const have = row[key];
    if (want !== null && typeof want === "object" && !(want instanceof Date)) {
      const cond = want as { in?: unknown[]; gte?: Date };
      if (cond.in) return cond.in.includes(have);
      if (cond.gte) return (have as Date).getTime() >= cond.gte.getTime();
    }
    return have === want;
  });
}

/** Rows with `select`'s relations filled in from the user table. */
function shape(row: Row, select: Record<string, unknown> | undefined, users: Row[]): Row {
  if (!select) return row;
  const out: Row = {};
  for (const [key, want] of Object.entries(select)) {
    if (want === true) out[key] = row[key];
    else if (typeof want === "object" && want !== null) {
      const by: Record<string, string> = { from: "fromUserId", to: "toUserId", friend: "friendId", blocked: "blockedId" };
      out[key] = users.find((u) => u.id === row[by[key]]) ?? null;
    }
  }
  return out;
}

/** Just enough of Prisma, in memory, for the friends code: the four tables and the calls it makes. */
function fakeDb(seed: { users?: Row[]; requests?: Row[]; sends?: Row[]; friendships?: Row[]; blocks?: Row[]; visits?: Row[] } = {}) {
  const users = seed.users ?? [];
  const tables = {
    friendRequest: seed.requests ?? [],
    friendRequestSend: seed.sends ?? [],
    friendship: seed.friendships ?? [],
    userBlock: seed.blocks ?? [],
    userVisit: seed.visits ?? [],
  };
  let nextId = 1;
  const locks = new Map<string, Promise<void>>();

  const table = (name: keyof typeof tables) => ({
    findUnique: vi.fn(async ({ where, select }: { where: Where; select?: Record<string, unknown> }) => {
      const row = tables[name].find((r) => matches(r, where));
      return row ? shape(row, select, users) : null;
    }),
    findFirst: vi.fn(async ({ where, select }: { where: Where; select?: Record<string, unknown> }) => {
      const row = tables[name].find((r) => matches(r, where));
      return row ? shape(row, select, users) : null;
    }),
    findMany: vi.fn(async ({ where, select }: { where: Where; select?: Record<string, unknown> }) =>
      tables[name].filter((r) => matches(r, where)).map((r) => shape(r, select, users)),
    ),
    count: vi.fn(async ({ where }: { where: Where }) => tables[name].filter((r) => matches(r, where)).length),
    create: vi.fn(async ({ data }: { data: Row }) => {
      const row = { id: `req${nextId++}`, status: "PENDING", createdAt: new Date(), respondedAt: null, ...data };
      tables[name].push(row);
      return row;
    }),
    createMany: vi.fn(async ({ data }: { data: Row[] }) => {
      for (const row of data) {
        const dupe = tables[name].some((r) => Object.entries(row).every(([k, v]) => r[k] === v));
        if (!dupe) tables[name].push({ createdAt: new Date(), ...row });
      }
      return { count: data.length };
    }),
    update: vi.fn(async ({ where, data }: { where: Where; data: Row }) => {
      const row = tables[name].find((r) => matches(r, where));
      if (!row) throw new Error("not found");
      Object.assign(row, data);
      return row;
    }),
    updateMany: vi.fn(async ({ where, data }: { where: Where; data: Row }) => {
      const hits = tables[name].filter((r) => matches(r, where));
      for (const row of hits) Object.assign(row, data);
      return { count: hits.length };
    }),
    deleteMany: vi.fn(async ({ where }: { where: Where }) => {
      const before = tables[name].length;
      tables[name] = tables[name].filter((r) => !matches(r, where));
      return { count: before - tables[name].length };
    }),
    groupBy: vi.fn(async ({ by, where }: { by: string[]; where: Where }) => {
      const key = by[0];
      const out = new Map<unknown, Row>();
      for (const row of tables[name].filter((r) => matches(r, where))) {
        const prev = out.get(row[key]);
        const seen = row.lastSeenAt as Date;
        if (!prev || (prev._max as { lastSeenAt: Date }).lastSeenAt < seen) out.set(row[key], { [key]: row[key], _max: { lastSeenAt: seen } });
      }
      return [...out.values()];
    }),
  });

  const db = {
    user: {
      findUnique: vi.fn(async ({ where, select }: { where: Where; select?: Record<string, unknown> }) => {
        const row = users.find((u) => matches(u, where));
        return row ? shape(row, select, users) : null;
      }),
    },
    friendRequest: table("friendRequest"),
    friendRequestSend: table("friendRequestSend"),
    friendship: table("friendship"),
    userBlock: table("userBlock"),
    userVisit: table("userVisit"),
    // Both forms the code uses: a callback with a client that can take advisory locks, or a list of already-started calls.
    $transaction: vi.fn(async (work: unknown) => {
      if (typeof work !== "function") return Promise.all(work as Promise<unknown>[]);
      const release: Array<() => void> = [];
      const tx = {
        ...db,
        // `select pg_advisory_xact_lock(hashtext(${id}))`: one holder per id, kept until this transaction ends.
        $queryRaw: vi.fn(async (_sql: TemplateStringsArray, id: string) => {
          const before = locks.get(id) ?? Promise.resolve();
          let done!: () => void;
          const mine = new Promise<void>((resolve) => (done = resolve));
          locks.set(id, before.then(() => mine));
          release.push(done);
          await before;
          return [];
        }),
      };
      try {
        return await work(tx);
      } finally {
        for (const done of release) done();
      }
    }),
    tables,
  };
  return db;
}

const A = { id: "a", username: "amy", name: "Amy", avatarKey: null, blockedAt: null };
const B = { id: "b", username: "bob", name: null, avatarKey: "k1", blockedAt: null };
const C = { id: "c", username: "cat", name: null, avatarKey: null, blockedAt: null };

// The real client's cast; the tests want the fake's tables too.
type AnyDb = ReturnType<typeof fakeDb>;
const as = (db: AnyDb) => db as unknown as Parameters<typeof sendFriendRequest>[2];

describe("sendFriendRequest", () => {
  let db: AnyDb;
  beforeEach(() => {
    db = fakeDb({ users: [A, B, C] });
  });

  it("finds the player by username in any case with spaces around, and makes one waiting row", async () => {
    expect(await sendFriendRequest("a", "  BoB ", as(db))).toEqual({ ok: true, message: "Request sent." });
    expect(db.tables.friendRequest).toHaveLength(1);
    expect(db.tables.friendRequest[0]).toMatchObject({ fromUserId: "a", toUserId: "b", status: "PENDING" });
  });

  it("refuses an empty, your own and an unknown username, and makes no row", async () => {
    expect(await sendFriendRequest("a", "   ", as(db))).toEqual({ error: "Type a username." });
    expect(await sendFriendRequest("a", "amy", as(db))).toEqual({ error: FRIEND_MESSAGES.self });
    expect(await sendFriendRequest("a", "nobody", as(db))).toEqual({ error: FRIEND_MESSAGES.noSuchPlayer });
    expect(await sendFriendRequest("a", "not a name!", as(db))).toEqual({ error: FRIEND_MESSAGES.noSuchPlayer });
    expect(db.tables.friendRequest).toHaveLength(0);
  });

  it("makes the friendship at once when they had already asked, with no request rows left", async () => {
    db.tables.friendRequest.push({ id: "r1", fromUserId: "b", toUserId: "a", status: "PENDING", createdAt: new Date(), respondedAt: null });
    expect(await sendFriendRequest("a", "bob", as(db))).toEqual({ ok: true, message: "You're now friends." });
    expect(db.tables.friendRequest).toHaveLength(0);
    expect(db.tables.friendship.map((f) => [f.userId, f.friendId])).toEqual([
      ["a", "b"],
      ["b", "a"],
    ]);
  });

  it("looks sent for 7 days after a decline, then is set back to waiting", async () => {
    const declined = { id: "r1", fromUserId: "a", toUserId: "b", status: "DECLINED", createdAt: new Date(0), respondedAt: new Date() };
    db.tables.friendRequest.push(declined);
    expect(await sendFriendRequest("a", "bob", as(db))).toEqual({ error: FRIEND_MESSAGES.alreadySent });
    expect(db.tables.friendRequest).toHaveLength(1);

    declined.respondedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    expect(await sendFriendRequest("a", "bob", as(db))).toEqual({ ok: true, message: "Request sent." });
    expect(db.tables.friendRequest).toHaveLength(1);
    expect(db.tables.friendRequest[0]).toMatchObject({ id: "r1", status: "PENDING", respondedAt: null });
  });

  it("treats a player who blocked you as no such player, and asks you to unblock one you blocked", async () => {
    db.tables.userBlock.push({ blockerId: "b", blockedId: "a", createdAt: new Date() });
    expect(await sendFriendRequest("a", "bob", as(db))).toEqual({ error: FRIEND_MESSAGES.noSuchPlayer });
    db.tables.userBlock.push({ blockerId: "a", blockedId: "c", createdAt: new Date() });
    expect(await sendFriendRequest("a", "cat", as(db))).toEqual({ error: FRIEND_MESSAGES.unblockFirst });
    expect(db.tables.friendRequest).toHaveLength(0);
  });

  it("refuses the 21st waiting request, the 31st in a day, and a full list, each making no row", async () => {
    const now = new Date();
    for (let i = 0; i < MAX_PENDING_SENT; i++) {
      db.tables.friendRequest.push({ id: `p${i}`, fromUserId: "a", toUserId: `x${i}`, status: "PENDING", createdAt: new Date(0), respondedAt: null });
    }
    expect(await sendFriendRequest("a", "bob", as(db))).toEqual({ error: FRIEND_MESSAGES.tooManyWaiting });

    db.tables.friendRequest.length = 0;
    for (let i = 0; i < MAX_REQUESTS_PER_DAY; i++) db.tables.friendRequestSend.push({ id: `s${i}`, fromUserId: "a", createdAt: now });
    expect(await sendFriendRequest("a", "bob", as(db))).toEqual({ error: FRIEND_MESSAGES.tooManyToday });
    expect(db.tables.friendRequestSend).toHaveLength(MAX_REQUESTS_PER_DAY);

    db.tables.friendRequestSend.length = 0;
    for (let i = 0; i < MAX_FRIENDS; i++) db.tables.friendship.push({ userId: "b", friendId: `x${i}`, createdAt: now });
    expect(await sendFriendRequest("a", "bob", as(db))).toEqual({ error: FRIEND_MESSAGES.listFull });
    expect(db.tables.friendRequest).toHaveLength(0);
    expect(db.tables.friendRequestSend).toHaveLength(0);
  });

  it("counts the day's sends even after each request is cancelled: the 31st is refused", async () => {
    const others = Array.from({ length: MAX_REQUESTS_PER_DAY + 1 }, (_, i) => ({ id: `x${i}`, username: `user${i}`, name: null, avatarKey: null, blockedAt: null }));
    db = fakeDb({ users: [A, ...others] });
    for (let i = 0; i < MAX_REQUESTS_PER_DAY; i++) {
      expect(await sendFriendRequest("a", `user${i}`, as(db))).toEqual({ ok: true, message: "Request sent." });
      expect(await cancelFriendRequest("a", db.tables.friendRequest[0].id as string, as(db))).toEqual({ ok: true });
    }
    expect(db.tables.friendRequest).toHaveLength(0);
    expect(await sendFriendRequest("a", `user${MAX_REQUESTS_PER_DAY}`, as(db))).toEqual({ error: FRIEND_MESSAGES.tooManyToday });
    expect(db.tables.friendRequest).toHaveLength(0);
    expect(db.tables.friendRequestSend).toHaveLength(MAX_REQUESTS_PER_DAY);
  });

  it("counts a send the receiver accepted, and one older than a day no longer", async () => {
    db.tables.friendRequestSend.push({ id: "old", fromUserId: "a", createdAt: new Date(Date.now() - REQUEST_WINDOW_MS - 1000) });
    for (let i = 0; i < MAX_REQUESTS_PER_DAY - 1; i++) db.tables.friendRequestSend.push({ id: `s${i}`, fromUserId: "a", createdAt: new Date() });
    expect(await sendFriendRequest("a", "bob", as(db))).toEqual({ ok: true, message: "Request sent." });
    expect(await respondFriendRequest("b", db.tables.friendRequest[0].id as string, true, as(db))).toEqual({ ok: true, message: "You're now friends." });
    expect(db.tables.friendRequest).toHaveLength(0);
    expect(await sendFriendRequest("a", "cat", as(db))).toEqual({ error: FRIEND_MESSAGES.tooManyToday });
  });

  it("a revived declined request counts as a new send", async () => {
    db.tables.friendRequest.push({ id: "r1", fromUserId: "a", toUserId: "b", status: "DECLINED", createdAt: new Date(0), respondedAt: new Date(0) });
    expect(await sendFriendRequest("a", "bob", as(db))).toEqual({ ok: true, message: "Request sent." });
    expect(db.tables.friendRequestSend).toHaveLength(1);
  });

  it("two sends at the same moment can't both squeeze under the daily limit", async () => {
    for (let i = 0; i < MAX_REQUESTS_PER_DAY - 1; i++) db.tables.friendRequestSend.push({ id: `s${i}`, fromUserId: "a", createdAt: new Date() });
    const results = await Promise.all([sendFriendRequest("a", "bob", as(db)), sendFriendRequest("a", "cat", as(db))]);
    expect(results).toContainEqual({ ok: true, message: "Request sent." });
    expect(results).toContainEqual({ error: FRIEND_MESSAGES.tooManyToday });
    expect(db.tables.friendRequest).toHaveLength(1);
    expect(db.tables.friendRequestSend).toHaveLength(MAX_REQUESTS_PER_DAY);
  });
});

describe("respondFriendRequest", () => {
  const waiting = () => ({ id: "r1", fromUserId: "a", toUserId: "b", status: "PENDING", createdAt: new Date(), respondedAt: null });

  it("accept makes both friendship rows and clears the request", async () => {
    const db = fakeDb({ users: [A, B], requests: [waiting()] });
    expect(await respondFriendRequest("b", "r1", true, as(db))).toEqual({ ok: true, message: "You're now friends." });
    expect(db.tables.friendship).toHaveLength(2);
    expect(db.tables.friendRequest).toHaveLength(0);
    // Tapped twice: the second finds nothing to accept.
    expect(await respondFriendRequest("b", "r1", true, as(db))).toEqual({ error: NOT_FOUND });
    expect(db.tables.friendship).toHaveLength(2);
  });

  it("decline marks it and leaves the row for the sender to see", async () => {
    const db = fakeDb({ users: [A, B], requests: [waiting()] });
    expect(await respondFriendRequest("b", "r1", false, as(db))).toEqual({ ok: true });
    expect(db.tables.friendRequest[0]).toMatchObject({ status: "DECLINED" });
    expect(db.tables.friendRequest[0].respondedAt).toBeInstanceOf(Date);
    expect(db.tables.friendship).toHaveLength(0);
  });

  it("only the receiver may: the sender or a stranger gets not found and changes nothing", async () => {
    const db = fakeDb({ users: [A, B, C], requests: [waiting()] });
    expect(await respondFriendRequest("a", "r1", true, as(db))).toEqual({ error: NOT_FOUND });
    expect(await respondFriendRequest("c", "r1", false, as(db))).toEqual({ error: NOT_FOUND });
    expect(db.tables.friendRequest[0]).toMatchObject({ status: "PENDING" });
    expect(db.tables.friendship).toHaveLength(0);
  });

  it("accept refuses a full list", async () => {
    const friendships = Array.from({ length: MAX_FRIENDS }, (_, i) => ({ userId: "b", friendId: `x${i}`, createdAt: new Date() }));
    const db = fakeDb({ users: [A, B], requests: [waiting()], friendships });
    expect(await respondFriendRequest("b", "r1", true, as(db))).toEqual({ error: FRIEND_MESSAGES.listFull });
    expect(db.tables.friendRequest).toHaveLength(1);
  });

  it("two accepts at the same moment can't take a list past the limit", async () => {
    const friendships = Array.from({ length: MAX_FRIENDS - 1 }, (_, i) => ({ userId: "b", friendId: `x${i}`, createdAt: new Date() }));
    const fromC = { id: "r2", fromUserId: "c", toUserId: "b", status: "PENDING", createdAt: new Date(), respondedAt: null };
    const db = fakeDb({ users: [A, B, C], requests: [waiting(), fromC], friendships });
    const results = await Promise.all([respondFriendRequest("b", "r1", true, as(db)), respondFriendRequest("b", "r2", true, as(db))]);
    expect(results).toContainEqual({ ok: true, message: "You're now friends." });
    expect(results).toContainEqual({ error: FRIEND_MESSAGES.listFull });
    expect(db.tables.friendship.filter((f) => f.userId === "b")).toHaveLength(MAX_FRIENDS);
    expect(db.tables.friendRequest).toHaveLength(1);
  });
});

describe("cancelFriendRequest", () => {
  it("the sender deletes it, declined or not; anyone else gets not found", async () => {
    const db = fakeDb({ users: [A, B], requests: [{ id: "r1", fromUserId: "a", toUserId: "b", status: "DECLINED", createdAt: new Date(), respondedAt: new Date() }] });
    expect(await cancelFriendRequest("b", "r1", as(db))).toEqual({ error: NOT_FOUND });
    expect(db.tables.friendRequest).toHaveLength(1);
    expect(await cancelFriendRequest("a", "r1", as(db))).toEqual({ ok: true });
    expect(db.tables.friendRequest).toHaveLength(0);
  });
});

describe("removeFriend", () => {
  it("deletes both rows; a stranger gets not found", async () => {
    const pair = [
      { userId: "a", friendId: "b", createdAt: new Date() },
      { userId: "b", friendId: "a", createdAt: new Date() },
    ];
    const db = fakeDb({ users: [A, B, C], friendships: pair });
    expect(await removeFriend("c", "b", as(db))).toEqual({ error: NOT_FOUND });
    expect(db.tables.friendship).toHaveLength(2);
    expect(await removeFriend("a", "b", as(db))).toEqual({ ok: true });
    expect(db.tables.friendship).toHaveLength(0);
  });
});

describe("blockPlayer and unblockPlayer", () => {
  it("block removes the friendship and requests both ways and lists them; unblock restores nothing", async () => {
    const db = fakeDb({
      users: [A, B],
      friendships: [
        { userId: "a", friendId: "b", createdAt: new Date() },
        { userId: "b", friendId: "a", createdAt: new Date() },
      ],
      requests: [{ id: "r1", fromUserId: "b", toUserId: "a", status: "PENDING", createdAt: new Date(), respondedAt: null }],
    });
    expect(await blockPlayer("a", "b", as(db))).toEqual({ ok: true });
    expect(db.tables.friendship).toHaveLength(0);
    expect(db.tables.friendRequest).toHaveLength(0);
    expect(db.tables.userBlock).toHaveLength(1);
    // Blocking again adds nothing.
    expect(await blockPlayer("a", "b", as(db))).toEqual({ ok: true });
    expect(db.tables.userBlock).toHaveLength(1);

    expect(await sendFriendRequest("b", "amy", as(db))).toEqual({ error: FRIEND_MESSAGES.noSuchPlayer });

    expect(await unblockPlayer("b", "a", as(db))).toEqual({ error: NOT_FOUND });
    expect(await unblockPlayer("a", "b", as(db))).toEqual({ ok: true });
    expect(db.tables.userBlock).toHaveLength(0);
    expect(db.tables.friendship).toHaveLength(0);
    expect(await sendFriendRequest("b", "amy", as(db))).toEqual({ ok: true, message: "Request sent." });
  });

  it("refuses yourself and an unknown player", async () => {
    const db = fakeDb({ users: [A] });
    expect(await blockPlayer("a", "a", as(db))).toEqual({ error: NOT_FOUND });
    expect(await blockPlayer("a", "ghost", as(db))).toEqual({ error: NOT_FOUND });
    expect(db.tables.userBlock).toHaveLength(0);
  });
});

describe("loadFriends", () => {
  it("shows online friends first, requests both ways, blocks and the waiting count", async () => {
    const now = Date.now();
    const X = { id: "x", username: "xan", name: null, avatarKey: null, blockedAt: null };
    const Y = { id: "y", username: "yun", name: null, avatarKey: null, blockedAt: null };
    const Z = { id: "z", username: "zed", name: null, avatarKey: null, blockedAt: null };
    const db = fakeDb({
      users: [A, B, C, X, Y, Z],
      friendships: [
        { userId: "a", friendId: "b", createdAt: new Date() },
        { userId: "a", friendId: "c", createdAt: new Date() },
      ],
      visits: [
        // Bob loaded a page 6 minutes ago, Cat 1 minute ago: only Cat is online.
        { userId: "b", lastSeenAt: new Date(now - ONLINE_WINDOW_MS - 60_000) },
        { userId: "c", lastSeenAt: new Date(now - 60_000) },
      ],
      requests: [
        { id: "r1", fromUserId: "x", toUserId: "a", status: "PENDING", createdAt: new Date(), respondedAt: null },
        { id: "r2", fromUserId: "a", toUserId: "y", status: "DECLINED", createdAt: new Date(), respondedAt: new Date() },
      ],
      blocks: [{ blockerId: "a", blockedId: "z", createdAt: new Date() }],
    });
    const view = await loadFriends("a", as(db), now);
    expect(view.friends.map((f) => [f.username, f.online])).toEqual([
      ["cat", true],
      ["bob", false],
    ]);
    expect(view.friends[1].avatarUrl).toBe("https://img/k1");
    expect(view.received.map((r) => r.id)).toEqual(["r1"]);
    expect(view.sent.map((r) => r.id)).toEqual(["r2"]);
    expect(view.received[0].from.username).toBe("xan");
    expect(view.blocked.map((p) => p.username)).toEqual(["zed"]);
    expect(view.waiting).toBe(1);
    expect(await waitingRequestCount("a", as(db))).toBe(1);
  });

  it("is empty for a player with nothing", async () => {
    const db = fakeDb({ users: [A] });
    expect(await loadFriends("a", as(db))).toEqual({ friends: [], received: [], sent: [], blocked: [], waiting: 0 });
    expect(db.userVisit.groupBy).not.toHaveBeenCalled();
  });
});

describe("standingWith", () => {
  it("reads each state and hides across a block or on your own page", async () => {
    const db = fakeDb({ users: [A, B, C] });
    expect(await standingWith("a", A, as(db))).toEqual({ standing: "hidden", requestId: null });
    expect(await standingWith("a", B, as(db))).toEqual({ standing: "none", requestId: null });

    db.tables.friendRequest.push({ id: "r1", fromUserId: "a", toUserId: "b", status: "PENDING", createdAt: new Date(), respondedAt: null });
    expect(await standingWith("a", B, as(db))).toEqual({ standing: "sent", requestId: "r1" });
    expect(await standingWith("b", A, as(db))).toEqual({ standing: "received", requestId: "r1" });

    db.tables.friendRequest.length = 0;
    db.tables.friendship.push({ userId: "a", friendId: "c", createdAt: new Date() });
    expect(await standingWith("a", C, as(db))).toEqual({ standing: "friends", requestId: null });

    db.tables.userBlock.push({ blockerId: "c", blockedId: "a", createdAt: new Date() });
    expect(await standingWith("a", C, as(db))).toEqual({ standing: "hidden", requestId: null });
  });
});
