/**
 * Friends: requests, the two-row friendships, blocks, and the lists the Friends screen shows.
 * The decisions that need no database live in lib/friend-rules.ts; this file loads the facts and writes the rows.
 */
import { prisma } from "@/lib/db";
import {
  decideSendRequest,
  FRIEND_MESSAGES,
  type FriendStanding,
  isOnline,
  MAX_FRIENDS,
  NOT_FOUND,
  ONLINE_WINDOW_MS,
  REQUEST_WINDOW_MS,
  sortFriends,
  standingOf,
} from "@/lib/friend-rules";
import { isUniqueViolation } from "@/lib/game-server";
import type { Prisma } from "@/lib/generated/prisma/client";
import { publicAvatarUrl } from "@/lib/r2";
import { checkUsername } from "@/lib/username";

export type FriendResult = { ok: true; message?: string } | { error: string };

export interface FriendPlayer {
  id: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface FriendEntry extends FriendPlayer {
  online: boolean;
}

/** Everything the Friends screen shows, in the shape it is sent to the browser. */
export interface FriendsView {
  friends: FriendEntry[];
  received: Array<{ id: string; from: FriendPlayer }>;
  /** Declined requests stay here, looking sent, until the sender cancels them. */
  sent: Array<{ id: string; to: FriendPlayer }>;
  blocked: FriendPlayer[];
  /** Requests waiting for this player: what lights the home screen's dot. */
  waiting: number;
}

type Db = typeof prisma;
type Tx = Prisma.TransactionClient;

const PLAYER_SELECT = { id: true, username: true, name: true, avatarKey: true, blockedAt: true } as const;
type PlayerRow = { id: string; username: string; name: string | null; avatarKey: string | null; blockedAt: Date | null };

const toPlayer = (row: PlayerRow): FriendPlayer => ({ id: row.id, username: row.username, name: row.name, avatarUrl: publicAvatarUrl(row.avatarKey) });

const betweenRequests = (a: string, b: string) => ({
  OR: [
    { fromUserId: a, toUserId: b },
    { fromUserId: b, toUserId: a },
  ],
});
const betweenFriendships = (a: string, b: string) => ({
  OR: [
    { userId: a, friendId: b },
    { userId: b, friendId: a },
  ],
});
const betweenBlocks = (a: string, b: string) => ({
  OR: [
    { blockerId: a, blockedId: b },
    { blockerId: b, blockedId: a },
  ],
});

/** Both rows of a friendship, and the requests between the two cleared away. Safe to repeat. */
async function makeFriends(tx: Tx, a: string, b: string) {
  await tx.friendship.createMany({
    data: [
      { userId: a, friendId: b },
      { userId: b, friendId: a },
    ],
    skipDuplicates: true,
  });
  await tx.friendRequest.deleteMany({ where: betweenRequests(a, b) });
}

/** Sends a request to the player with this username, or makes the friendship when they had already asked. */
export async function sendFriendRequest(userId: string, typed: string, db: Db = prisma): Promise<FriendResult> {
  if (!typed.trim()) return { error: "Type a username." };
  const checked = checkUsername(typed);
  if ("error" in checked) return { error: FRIEND_MESSAGES.noSuchPlayer };

  const target = await db.user.findUnique({ where: { username: checked.username }, select: { id: true, blockedAt: true } });
  if (!target) return { error: FRIEND_MESSAGES.noSuchPlayer };
  const now = new Date();
  try {
    return await db.$transaction(async (tx): Promise<FriendResult> => {
      // Both players locked: two sends at once can't both pass a limit, and one sent each way becomes the friendship.
      await lockPlayers(tx, userId, target.id);
      const facts = await loadSendFacts(tx, userId, target.id, now);
      const decision = decideSendRequest({ selfId: userId, target, ...facts }, now.getTime());
      if (decision.kind === "error") return { error: decision.message };
      if (decision.kind === "accept-cross") {
        await makeFriends(tx, userId, target.id);
        return { ok: true, message: "You're now friends." };
      }
      if (decision.kind === "revive") {
        await tx.friendRequest.update({
          where: { fromUserId_toUserId: { fromUserId: userId, toUserId: target.id } },
          data: { status: "PENDING", createdAt: now, respondedAt: null },
        });
      } else {
        await tx.friendRequest.create({ data: { fromUserId: userId, toUserId: target.id } });
      }
      // The log outlives the request, so cancelling or accepting can't reset the daily limit.
      await tx.friendRequestSend.create({ data: { fromUserId: userId, createdAt: now } });
      return { ok: true, message: "Request sent." };
    });
  } catch (error) {
    // Two taps at once: the second finds the first one's row.
    if (isUniqueViolation(error, "toUserId")) return { error: FRIEND_MESSAGES.alreadySent };
    throw error;
  }
}

/**
 * Holds a lock on each player until the transaction ends, always in the same order so two changes can't wait on each other.
 * Through $executeRaw on purpose: the lock returns Postgres type `void`, which the Neon adapter can't read as a $queryRaw column.
 */
async function lockPlayers(tx: Tx, ...ids: string[]) {
  for (const id of [...new Set(ids)].sort()) await tx.$executeRaw`select pg_advisory_xact_lock(hashtext(${id}))`;
}

async function loadSendFacts(tx: Tx, userId: string, targetId: string, now: Date) {
  const [blocks, friendship, mySent, theirSent, myFriendCount, theirFriendCount, myPendingSent, mySentInWindow] = await Promise.all([
    tx.userBlock.findMany({ where: betweenBlocks(userId, targetId), select: { blockerId: true } }),
    tx.friendship.findUnique({ where: { userId_friendId: { userId, friendId: targetId } }, select: { userId: true } }),
    tx.friendRequest.findUnique({ where: { fromUserId_toUserId: { fromUserId: userId, toUserId: targetId } }, select: { status: true, respondedAt: true } }),
    tx.friendRequest.findUnique({ where: { fromUserId_toUserId: { fromUserId: targetId, toUserId: userId } }, select: { status: true } }),
    tx.friendship.count({ where: { userId } }),
    tx.friendship.count({ where: { userId: targetId } }),
    tx.friendRequest.count({ where: { fromUserId: userId, status: "PENDING" } }),
    tx.friendRequestSend.count({ where: { fromUserId: userId, createdAt: { gte: new Date(now.getTime() - REQUEST_WINDOW_MS) } } }),
  ]);
  return {
    targetBlockedMe: blocks.some((b) => b.blockerId === targetId),
    iBlockedTarget: blocks.some((b) => b.blockerId === userId),
    alreadyFriends: friendship !== null,
    mySent,
    theirSent,
    myFriendCount,
    theirFriendCount,
    myPendingSent,
    mySentInWindow,
  };
}

/** Accepts or declines a request sent to this player. Only the receiver may; anything else is not found. */
export async function respondFriendRequest(userId: string, requestId: string, accept: boolean, db: Db = prisma): Promise<FriendResult> {
  if (!accept) {
    const { count } = await db.friendRequest.updateMany({
      where: { id: requestId, toUserId: userId, status: "PENDING" },
      data: { status: "DECLINED", respondedAt: new Date() },
    });
    return count === 0 ? { error: NOT_FOUND } : { ok: true };
  }

  const waiting = { id: requestId, toUserId: userId, status: "PENDING" as const };
  return db.$transaction(async (tx): Promise<FriendResult> => {
    const request = await tx.friendRequest.findFirst({ where: waiting, select: { fromUserId: true } });
    if (!request) return { error: NOT_FOUND };
    await lockPlayers(tx, userId, request.fromUserId);
    // Looked up again under the lock: a block or an earlier tap may have taken it away meanwhile.
    if (!(await tx.friendRequest.findFirst({ where: waiting, select: { id: true } }))) return { error: NOT_FOUND };
    const mine = await tx.friendship.count({ where: { userId } });
    const theirs = await tx.friendship.count({ where: { userId: request.fromUserId } });
    if (mine >= MAX_FRIENDS || theirs >= MAX_FRIENDS) return { error: FRIEND_MESSAGES.listFull };
    await makeFriends(tx, userId, request.fromUserId);
    return { ok: true, message: "You're now friends." };
  });
}

/** Takes back a request this player sent, declined or not. */
export async function cancelFriendRequest(userId: string, requestId: string, db: Db = prisma): Promise<FriendResult> {
  const { count } = await db.friendRequest.deleteMany({ where: { id: requestId, fromUserId: userId } });
  return count === 0 ? { error: NOT_FOUND } : { ok: true };
}

/** Ends a friendship, both rows at once. The other player is not told. */
export async function removeFriend(userId: string, friendId: string, db: Db = prisma): Promise<FriendResult> {
  const { count } = await db.friendship.deleteMany({ where: betweenFriendships(userId, friendId) });
  return count === 0 ? { error: NOT_FOUND } : { ok: true };
}

/** Blocks a player: the friendship and any requests between them go too. Safe to repeat. */
export async function blockPlayer(userId: string, blockedId: string, db: Db = prisma): Promise<FriendResult> {
  if (blockedId === userId) return { error: NOT_FOUND };
  const other = await db.user.findUnique({ where: { id: blockedId }, select: { id: true } });
  if (!other) return { error: NOT_FOUND };
  await db.$transaction([
    db.userBlock.createMany({ data: [{ blockerId: userId, blockedId }], skipDuplicates: true }),
    db.friendship.deleteMany({ where: betweenFriendships(userId, blockedId) }),
    db.friendRequest.deleteMany({ where: betweenRequests(userId, blockedId) }),
  ]);
  return { ok: true };
}

/** Lifts a block. Nothing it removed comes back. */
export async function unblockPlayer(userId: string, blockedId: string, db: Db = prisma): Promise<FriendResult> {
  const { count } = await db.userBlock.deleteMany({ where: { blockerId: userId, blockedId } });
  return count === 0 ? { error: NOT_FOUND } : { ok: true };
}

/** How many requests wait for this player; the home screen's dot. */
export async function waitingRequestCount(userId: string, db: Db = prisma): Promise<number> {
  return db.friendRequest.count({ where: { toUserId: userId, status: "PENDING" } });
}

/** Everything on the Friends screen for this player. */
export async function loadFriends(userId: string, db: Db = prisma, now = Date.now()): Promise<FriendsView> {
  const [friendRows, received, sent, blocks] = await Promise.all([
    db.friendship.findMany({ where: { userId }, select: { friend: { select: PLAYER_SELECT } } }),
    db.friendRequest.findMany({
      where: { toUserId: userId, status: "PENDING" },
      select: { id: true, from: { select: PLAYER_SELECT } },
      orderBy: { createdAt: "desc" },
    }),
    db.friendRequest.findMany({ where: { fromUserId: userId }, select: { id: true, to: { select: PLAYER_SELECT } }, orderBy: { createdAt: "desc" } }),
    db.userBlock.findMany({ where: { blockerId: userId }, select: { blocked: { select: PLAYER_SELECT } }, orderBy: { createdAt: "desc" } }),
  ]);

  const friendIds = friendRows.map((r) => r.friend.id);
  const lastSeen = new Map<string, Date>();
  if (friendIds.length > 0) {
    const visits = await db.userVisit.groupBy({
      by: ["userId"],
      where: { userId: { in: friendIds }, lastSeenAt: { gte: new Date(now - ONLINE_WINDOW_MS) } },
      _max: { lastSeenAt: true },
    });
    for (const v of visits) if (v._max.lastSeenAt) lastSeen.set(v.userId, v._max.lastSeenAt);
  }

  return {
    friends: sortFriends(friendRows.map(({ friend }) => ({ ...toPlayer(friend), online: isOnline(lastSeen.get(friend.id), friend.blockedAt, now) }))),
    received: received.map((r) => ({ id: r.id, from: toPlayer(r.from) })),
    sent: sent.map((r) => ({ id: r.id, to: toPlayer(r.to) })),
    blocked: blocks.map((b) => toPlayer(b.blocked)),
    waiting: received.length,
  };
}

/** Where the signed-in viewer stands with the player whose profile they are on, and the request behind it. */
export async function standingWith(
  viewerId: string,
  other: { id: string; blockedAt: Date | null },
  db: Db = prisma,
): Promise<{ standing: FriendStanding; requestId: string | null }> {
  if (viewerId === other.id || other.blockedAt !== null) return { standing: "hidden", requestId: null };
  const [friendship, block, sent, received] = await Promise.all([
    db.friendship.findUnique({ where: { userId_friendId: { userId: viewerId, friendId: other.id } }, select: { userId: true } }),
    db.userBlock.findFirst({ where: betweenBlocks(viewerId, other.id), select: { blockerId: true } }),
    db.friendRequest.findUnique({ where: { fromUserId_toUserId: { fromUserId: viewerId, toUserId: other.id } }, select: { id: true, status: true } }),
    db.friendRequest.findUnique({ where: { fromUserId_toUserId: { fromUserId: other.id, toUserId: viewerId } }, select: { id: true, status: true } }),
  ]);
  const standing = standingOf({ viewerId, otherId: other.id, friends: friendship !== null, blockedEitherWay: block !== null, sent, received });
  const requestId = standing === "sent" ? sent!.id : standing === "received" ? received!.id : null;
  return { standing, requestId };
}
