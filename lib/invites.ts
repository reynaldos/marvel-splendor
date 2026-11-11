/** Room invites: sending one from the lobby, the lobby's friends list, and answering one from the invite view. */
import { prisma } from "@/lib/db";
import { NOT_FOUND } from "@/lib/friend-rules";
import { type FriendEntry, type FriendPlayer, type FriendResult, friendsOf, PLAYER_SELECT, ROOM_SELECT, roomOf, toPlayer } from "@/lib/friends";
import { isUniqueViolation } from "@/lib/game-server";
import { canResend, INVITE_MESSAGES, inviteClosedReason, MAX_INVITES_PER_ROOM } from "@/lib/invite-rules";
import { joinLobby } from "@/lib/lobby";
import { notifyGame, notifyUser } from "@/lib/pusher";

type Db = typeof prisma;

/** A friend in the lobby's invite dialog, with the invite to this room they have, if any. */
export type InvitableFriend = FriendEntry & { invite: { status: "PENDING" | "DECLINED"; sentAt: number } | null };

/** Invites a friend to a room the player is seated in. An unanswered one may be sent again after a minute; a declined one may not. */
export async function sendInvite(userId: string, gameId: string, friendId: string, db: Db = prisma): Promise<FriendResult> {
  const game = await db.game.findUnique({ where: { id: gameId }, select: { ...ROOM_SELECT, players: { select: { userId: true } } } });
  if (!game?.players.some((p) => p.userId === userId)) return { error: NOT_FOUND };
  const reason = inviteClosedReason(roomOf(game));
  if (reason) return { error: reason };
  if (game.players.some((p) => p.userId === friendId)) return { error: INVITE_MESSAGES.seated };

  // Checked now, so a removed friend or an admin-blocked one can't be asked.
  const friendship = await db.friendship.findUnique({ where: { userId_friendId: { userId, friendId } }, select: { friend: { select: { blockedAt: true } } } });
  if (!friendship || friendship.friend.blockedAt) return { error: NOT_FOUND };

  const existing = await db.gameInvite.findUnique({ where: { gameId_toUserId: { gameId, toUserId: friendId } }, select: { status: true, createdAt: true } });
  if (existing) {
    if (existing.status === "DECLINED") return { error: INVITE_MESSAGES.theyDeclined };
    if (existing.status === "PENDING" && !canResend(existing.createdAt.getTime())) return { error: INVITE_MESSAGES.tooSoon };
    // A resend, or one taken up before they left: waiting again, as new.
    await db.gameInvite.update({
      where: { gameId_toUserId: { gameId, toUserId: friendId } },
      data: { status: "PENDING", fromUserId: userId, createdAt: new Date(), respondedAt: null },
    });
  } else {
    if ((await db.gameInvite.count({ where: { gameId, fromUserId: userId } })) >= MAX_INVITES_PER_ROOM) return { error: INVITE_MESSAGES.tooMany };
    try {
      await db.gameInvite.create({ data: { gameId, fromUserId: userId, toUserId: friendId } });
    } catch (error) {
      // Two taps at once: the second finds the first one's row.
      if (isUniqueViolation(error, "toUserId")) return { error: INVITE_MESSAGES.tooSoon };
      throw error;
    }
  }
  await notifyUser(friendId);
  return { ok: true };
}

/** Join seats the invited player through `joinLobby` and marks the invite taken only when that worked; Decline marks it declined. */
export async function respondInvite(userId: string, inviteId: string, accept: boolean, db: Db = prisma): Promise<FriendResult> {
  const invite = await db.gameInvite.findFirst({
    where: { id: inviteId, toUserId: userId, status: "PENDING" },
    select: { gameId: true, game: { select: { joinCode: true } } },
  });
  if (!invite) return { error: NOT_FOUND };
  if (accept) {
    const joined = await joinLobby(userId, invite.game.joinCode);
    if (!joined.ok) return { error: joined.reason };
  }
  await db.gameInvite.updateMany({
    where: { id: inviteId, status: "PENDING" },
    data: { status: accept ? "ACCEPTED" : "DECLINED", respondedAt: new Date() },
  });
  // The inviter's lobby re-renders and shows the decline; a Join already told it through joinLobby.
  if (!accept) await notifyGame(invite.gameId);
  return { ok: true };
}

/** The player's friends for the lobby's dialog, leaving out anyone already seated. */
export async function invitableFriends(userId: string, gameId: string, seatedIds: string[], db: Db = prisma): Promise<InvitableFriend[]> {
  const [friends, rows] = await Promise.all([
    friendsOf(userId, db),
    db.gameInvite.findMany({ where: { gameId, status: { in: ["PENDING", "DECLINED"] } }, select: { toUserId: true, status: true, createdAt: true } }),
  ]);
  const byFriend = new Map(rows.map((r) => [r.toUserId, { status: r.status as "PENDING" | "DECLINED", sentAt: r.createdAt.getTime() }]));
  return friends.filter((f) => !seatedIds.includes(f.id)).map((f) => ({ ...f, invite: byFriend.get(f.id) ?? null }));
}

/** The invite behind `?invite=` on a lobby, if it is this player's and for this room. */
export async function inviteFor(userId: string, inviteId: string, gameId: string, db: Db = prisma): Promise<{ status: string; from: FriendPlayer } | null> {
  const row = await db.gameInvite.findFirst({ where: { id: inviteId, toUserId: userId, gameId }, select: { status: true, from: { select: PLAYER_SELECT } } });
  return row ? { status: row.status, from: toPlayer(row.from) } : null;
}
