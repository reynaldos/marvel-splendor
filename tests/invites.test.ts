import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/generated/prisma/client", () => ({ Prisma: {} }));
vi.mock("@/lib/r2", () => ({ publicAvatarUrl: (key: string | null) => (key ? `https://img/${key}` : null) }));
vi.mock("@/lib/pusher", () => ({ notifyUser: vi.fn(async () => {}), notifyGame: vi.fn(async () => {}) }));
vi.mock("@/lib/push", () => ({ pushFriendRequest: vi.fn(), pushInvite: vi.fn() }));
vi.mock("@/lib/lobby", async (original) => ({ ...(await original<typeof import("@/lib/lobby")>()), joinLobby: vi.fn() }));

import { NOT_FOUND } from "@/lib/friend-rules";
import { INVITE_MESSAGES, MAX_INVITES_PER_ROOM, RESEND_AFTER_MS } from "@/lib/invite-rules";
import { invitableFriends, inviteFor, respondInvite, sendInvite } from "@/lib/invites";
import { joinLobby } from "@/lib/lobby";
import { pushInvite } from "@/lib/push";
import { notifyGame, notifyUser } from "@/lib/pusher";

type Invite = { id: string; gameId: string; fromUserId: string; toUserId: string; status: string; createdAt?: Date };
const LONG_AGO = new Date(Date.now() - RESEND_AFTER_MS - 1_000);
const BOB = { id: "b", username: "bob", name: null, avatarKey: null, blockedAt: null };

/** A room host "a" sits in, friends with "b", and the invite table the code reads and writes. */
function fakeDb(opts: { status?: string; seated?: string[]; friends?: string[]; invites?: Invite[] } = {}) {
  const seated = opts.seated ?? ["a"];
  const friends = opts.friends ?? ["b"];
  const invites: Invite[] = opts.invites ?? [];
  const find = (where: Partial<Invite> & { gameId_toUserId?: { gameId: string; toUserId: string } }) =>
    invites.find((i) => Object.entries(where.gameId_toUserId ?? where).every(([k, v]) => i[k as keyof Invite] === v));
  const db = {
    game: {
      findUnique: vi.fn(async () => ({
        status: opts.status ?? "LOBBY",
        state: {},
        settings: {},
        _count: { players: seated.length },
        players: seated.map((userId) => ({ userId })),
      })),
    },
    friendship: {
      findUnique: vi.fn(async ({ where }: { where: { userId_friendId: { friendId: string } } }) =>
        friends.includes(where.userId_friendId.friendId) ? { friend: { blockedAt: null } } : null,
      ),
      findMany: vi.fn(async () => friends.map((id) => ({ friend: { ...BOB, id, username: `u-${id}` } }))),
    },
    userVisit: { groupBy: vi.fn(async () => []) },
    gameInvite: {
      findUnique: vi.fn(async ({ where }: { where: Parameters<typeof find>[0] }) => {
        const row = find(where);
        return row ? { createdAt: LONG_AGO, ...row } : null;
      }),
      findFirst: vi.fn(async ({ where }: { where: Partial<Invite> }) => {
        const row = find(where);
        return row ? { ...row, game: { joinCode: "ABC234" }, from: { ...BOB, id: row.fromUserId } } : null;
      }),
      findMany: vi.fn(async ({ where }: { where: { gameId: string; status: { in: string[] } } }) =>
        invites.filter((i) => i.gameId === where.gameId && where.status.in.includes(i.status)).map((i) => ({ ...i, createdAt: i.createdAt ?? LONG_AGO })),
      ),
      count: vi.fn(async ({ where }: { where: Partial<Invite> }) => invites.filter((i) => i.gameId === where.gameId && i.fromUserId === where.fromUserId).length),
      create: vi.fn(async ({ data }: { data: Omit<Invite, "id" | "status"> }) => {
        const row = { id: `i${invites.length + 1}`, status: "PENDING", createdAt: new Date(), ...data };
        invites.push(row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: { where: Parameters<typeof find>[0]; data: Partial<Invite> }) => Object.assign(find(where)!, data)),
      updateMany: vi.fn(async ({ where, data }: { where: Partial<Invite>; data: Partial<Invite> }) => {
        const row = find(where);
        if (row) Object.assign(row, data);
        return { count: row ? 1 : 0 };
      }),
    },
    invites,
  };
  return db;
}
const as = (db: ReturnType<typeof fakeDb>) => db as unknown as Parameters<typeof sendInvite>[3];

beforeEach(() => vi.clearAllMocks());

describe("sendInvite", () => {
  it("invites a friend once and tells them; sending again inside a minute is refused", async () => {
    const db = fakeDb();
    expect(await sendInvite("a", "g", "b", as(db))).toEqual({ ok: true });
    expect(db.invites).toHaveLength(1);
    expect(notifyUser).toHaveBeenCalledWith("b");
    expect(pushInvite).toHaveBeenCalledWith("a", "b", { id: "i1", gameId: "g", line: "Marvel game, 1 of 4 seats taken" }, expect.anything());
    expect(await sendInvite("a", "g", "b", as(db))).toEqual({ error: INVITE_MESSAGES.tooSoon });
    expect(pushInvite).toHaveBeenCalledTimes(1);
    expect(db.invites).toHaveLength(1);
  });

  it("sends an unanswered invite again after a minute, as new, and tells them again", async () => {
    const db = fakeDb({ invites: [{ id: "i1", gameId: "g", fromUserId: "a", toUserId: "b", status: "PENDING", createdAt: LONG_AGO }] });
    expect(await sendInvite("a", "g", "b", as(db))).toEqual({ ok: true });
    expect(db.invites).toHaveLength(1);
    expect(db.invites[0].createdAt!.getTime()).toBeGreaterThan(LONG_AGO.getTime());
    expect(notifyUser).toHaveBeenCalledWith("b");
  });

  it("is only for a seated player, to a friend who isn't seated, while the room is open", async () => {
    expect(await sendInvite("x", "g", "b", as(fakeDb()))).toEqual({ error: NOT_FOUND });
    expect(await sendInvite("a", "g", "c", as(fakeDb()))).toEqual({ error: NOT_FOUND });
    expect(await sendInvite("a", "g", "b", as(fakeDb({ seated: ["a", "b"] })))).toEqual({ error: INVITE_MESSAGES.seated });
    expect(await sendInvite("a", "g", "b", as(fakeDb({ status: "ACTIVE" })))).toEqual({ error: INVITE_MESSAGES.started });
    expect(await sendInvite("a", "g", "b", as(fakeDb({ seated: ["a", "x", "y", "z"] })))).toEqual({ error: INVITE_MESSAGES.full });
  });

  it("refuses to send a declined invite again, and asks again after one was taken up", async () => {
    const declined = fakeDb({ invites: [{ id: "i1", gameId: "g", fromUserId: "a", toUserId: "b", status: "DECLINED" }] });
    expect(await sendInvite("a", "g", "b", as(declined))).toEqual({ error: INVITE_MESSAGES.theyDeclined });
    expect(declined.invites[0].status).toBe("DECLINED");
    expect(notifyUser).not.toHaveBeenCalled();

    const taken = fakeDb({ invites: [{ id: "i1", gameId: "g", fromUserId: "a", toUserId: "b", status: "ACCEPTED" }] });
    expect(await sendInvite("a", "g", "b", as(taken))).toEqual({ ok: true });
    expect(taken.invites[0].status).toBe("PENDING");
  });

  it(`refuses the ${MAX_INVITES_PER_ROOM + 1}th invite from one player to one room`, async () => {
    const full = Array.from({ length: MAX_INVITES_PER_ROOM }, (_, n) => ({ id: `i${n}`, gameId: "g", fromUserId: "a", toUserId: `f${n}`, status: "PENDING" }));
    const db = fakeDb({ invites: full });
    expect(await sendInvite("a", "g", "b", as(db))).toEqual({ error: INVITE_MESSAGES.tooMany });
    expect(db.invites).toHaveLength(MAX_INVITES_PER_ROOM);
  });
});

describe("respondInvite", () => {
  const waiting = (): Invite[] => [{ id: "i1", gameId: "g", fromUserId: "a", toUserId: "b", status: "PENDING" }];

  it("Join seats through joinLobby and marks it taken only when that worked", async () => {
    const db = fakeDb({ invites: waiting() });
    vi.mocked(joinLobby).mockResolvedValueOnce({ ok: false, reason: "That game is full." });
    expect(await respondInvite("b", "i1", true, as(db))).toEqual({ error: "That game is full." });
    expect(db.invites[0].status).toBe("PENDING");

    vi.mocked(joinLobby).mockResolvedValueOnce({ ok: true, gameId: "g", status: "LOBBY" });
    expect(await respondInvite("b", "i1", true, as(db))).toEqual({ ok: true });
    expect(joinLobby).toHaveBeenLastCalledWith("b", "ABC234");
    expect(db.invites[0].status).toBe("ACCEPTED");
  });

  it("Decline marks it declined without seating anyone, and refreshes the room so the inviter sees it", async () => {
    const db = fakeDb({ invites: waiting() });
    expect(await respondInvite("b", "i1", false, as(db))).toEqual({ ok: true });
    expect(db.invites[0].status).toBe("DECLINED");
    expect(joinLobby).not.toHaveBeenCalled();
    expect(notifyGame).toHaveBeenCalledWith("g");
  });

  it("is not found for anyone but the invited player, or once answered", async () => {
    const db = fakeDb({ invites: waiting() });
    expect(await respondInvite("a", "i1", true, as(db))).toEqual({ error: NOT_FOUND });
    await respondInvite("b", "i1", false, as(db));
    expect(await respondInvite("b", "i1", true, as(db))).toEqual({ error: NOT_FOUND });
  });
});

describe("the lobby's list and the invite view", () => {
  it("lists friends not seated, with the invite each has: waiting, declined or none", async () => {
    const db = fakeDb({
      friends: ["b", "c", "d", "e"],
      invites: [
        { id: "i1", gameId: "g", fromUserId: "a", toUserId: "c", status: "PENDING" },
        { id: "i2", gameId: "g", fromUserId: "a", toUserId: "e", status: "DECLINED" },
      ],
    });
    const list = await invitableFriends("a", "g", ["a", "d"], as(db));
    expect(list.map((f) => [f.id, f.invite?.status ?? null])).toEqual([
      ["b", null],
      ["c", "PENDING"],
      ["e", "DECLINED"],
    ]);
  });

  it("finds the invite only for its own player and room", async () => {
    const db = fakeDb({ invites: [{ id: "i1", gameId: "g", fromUserId: "a", toUserId: "b", status: "PENDING" }] });
    expect(await inviteFor("b", "i1", "g", as(db))).toMatchObject({ status: "PENDING", from: { id: "a" } });
    expect(await inviteFor("c", "i1", "g", as(db))).toBeNull();
    expect(await inviteFor("b", "i1", "other", as(db))).toBeNull();
  });
});
