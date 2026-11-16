/** The friends rules that need no database, so they can be tested on their own. */

/** At most this many friends a player may have. */
export const MAX_FRIENDS = 200;
/** At most this many of a player's sent requests may wait at once. */
export const MAX_PENDING_SENT = 20;
/** At most this many requests a player may send in a rolling day. */
export const MAX_REQUESTS_PER_DAY = 30;
export const REQUEST_WINDOW_MS = 24 * 60 * 60 * 1000;
/** A declined request keeps looking sent, and can't be sent again, for this long. */
export const DECLINE_HOLD_MS = 7 * 24 * 60 * 60 * 1000;
/** A friend is online while their last page load is this recent. */
export const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export const NOT_FOUND = "Not found";
export const NO_SUCH_PLAYER = "No player has that username.";

export const FRIEND_MESSAGES = {
  self: "That's you.",
  noSuchPlayer: NO_SUCH_PLAYER,
  unblockFirst: "Unblock them first.",
  alreadyFriends: "You're already friends.",
  alreadySent: "Request already sent.",
  listFull: "Friends list is full.",
  tooManyWaiting: `You have ${MAX_PENDING_SENT} requests waiting. Cancel one first.`,
  tooManyToday: `You've sent ${MAX_REQUESTS_PER_DAY} requests today. Try again tomorrow.`,
} as const;

export type FriendRequestStatusValue = "PENDING" | "DECLINED";

/** What the sender's and receiver's rows look like when a request is sent, with no database in it. */
export interface SendRequestFacts {
  selfId: string;
  /** Null when no player has the username. */
  target: { id: string; blockedAt: Date | null } | null;
  targetBlockedMe: boolean;
  iBlockedTarget: boolean;
  alreadyFriends: boolean;
  /** The request I already sent them, if any. */
  mySent: { status: FriendRequestStatusValue; respondedAt: Date | null } | null;
  /** The request they sent me, if any. */
  theirSent: { status: FriendRequestStatusValue } | null;
  myFriendCount: number;
  theirFriendCount: number;
  myPendingSent: number;
  mySentInWindow: number;
}

export type SendRequestDecision =
  | { kind: "error"; message: string }
  /** They already asked: the two become friends at once. */
  | { kind: "accept-cross" }
  | { kind: "create" }
  /** My old declined request is set back to waiting. */
  | { kind: "revive" };

/** Whether a declined request is still inside the hold, so it looks sent. */
export function declineHolds(respondedAt: Date | null, now = Date.now()): boolean {
  return respondedAt !== null && now - respondedAt.getTime() < DECLINE_HOLD_MS;
}

/** Decides what sending a request does, in the order the rules are checked. */
export function decideSendRequest(facts: SendRequestFacts, now = Date.now()): SendRequestDecision {
  const { target } = facts;
  if (target && target.id === facts.selfId) return { kind: "error", message: FRIEND_MESSAGES.self };
  // An admin-blocked player and one who blocked me look the same as nobody, so a block can't be detected.
  if (!target || target.blockedAt !== null || facts.targetBlockedMe) return { kind: "error", message: FRIEND_MESSAGES.noSuchPlayer };
  if (facts.iBlockedTarget) return { kind: "error", message: FRIEND_MESSAGES.unblockFirst };
  if (facts.alreadyFriends) return { kind: "error", message: FRIEND_MESSAGES.alreadyFriends };
  if (facts.mySent?.status === "PENDING") return { kind: "error", message: FRIEND_MESSAGES.alreadySent };
  if (facts.mySent?.status === "DECLINED" && declineHolds(facts.mySent.respondedAt, now)) {
    return { kind: "error", message: FRIEND_MESSAGES.alreadySent };
  }
  if (facts.myFriendCount >= MAX_FRIENDS || facts.theirFriendCount >= MAX_FRIENDS) return { kind: "error", message: FRIEND_MESSAGES.listFull };
  if (facts.theirSent?.status === "PENDING") return { kind: "accept-cross" };
  if (facts.myPendingSent >= MAX_PENDING_SENT) return { kind: "error", message: FRIEND_MESSAGES.tooManyWaiting };
  if (facts.mySentInWindow >= MAX_REQUESTS_PER_DAY) return { kind: "error", message: FRIEND_MESSAGES.tooManyToday };
  return facts.mySent ? { kind: "revive" } : { kind: "create" };
}

/** Online means a page loaded inside the window; an admin-blocked player is never online. */
export function isOnline(lastSeenAt: Date | null | undefined, blockedAt: Date | null = null, now = Date.now()): boolean {
  return blockedAt === null && lastSeenAt != null && now - lastSeenAt.getTime() < ONLINE_WINDOW_MS;
}

/** Online friends first, then the rest, each part by username A to Z. */
export function sortFriends<T extends { username: string; online: boolean }>(friends: T[]): T[] {
  return [...friends].sort((a, b) => Number(b.online) - Number(a.online) || a.username.localeCompare(b.username));
}

/** Where a signed-in viewer stands with another player, for the one button on a profile. */
export type FriendStanding = "none" | "sent" | "received" | "friends" | "hidden";

export interface StandingFacts {
  viewerId: string;
  otherId: string;
  friends: boolean;
  blockedEitherWay: boolean;
  /** The viewer's request to them, if any. */
  sent: { status: FriendRequestStatusValue } | null;
  /** Their waiting request to the viewer, if any. */
  received: { status: FriendRequestStatusValue } | null;
}

/** Hidden on your own profile and wherever either has blocked the other. A declined request still reads as sent. */
export function standingOf(facts: StandingFacts): FriendStanding {
  if (facts.viewerId === facts.otherId || facts.blockedEitherWay) return "hidden";
  if (facts.friends) return "friends";
  if (facts.received?.status === "PENDING") return "received";
  if (facts.sent) return "sent";
  return "none";
}
