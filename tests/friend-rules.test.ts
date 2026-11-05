import { describe, expect, it } from "vitest";

import {
  DECLINE_HOLD_MS,
  decideSendRequest,
  declineHolds,
  FRIEND_MESSAGES,
  isOnline,
  MAX_FRIENDS,
  MAX_PENDING_SENT,
  MAX_REQUESTS_PER_DAY,
  ONLINE_WINDOW_MS,
  type SendRequestFacts,
  sortFriends,
  standingOf,
  type StandingFacts,
} from "@/lib/friend-rules";

const NOW = Date.UTC(2026, 10, 5, 12, 0, 0);

/** A sends to B, nothing in the way. */
function facts(over: Partial<SendRequestFacts> = {}): SendRequestFacts {
  return {
    selfId: "a",
    target: { id: "b", blockedAt: null },
    targetBlockedMe: false,
    iBlockedTarget: false,
    alreadyFriends: false,
    mySent: null,
    theirSent: null,
    myFriendCount: 0,
    theirFriendCount: 0,
    myPendingSent: 0,
    mySentInWindow: 0,
    ...over,
  };
}

const error = (message: string) => ({ kind: "error", message });

describe("decideSendRequest", () => {
  it("makes a waiting request when nothing is in the way", () => {
    expect(decideSendRequest(facts(), NOW)).toEqual({ kind: "create" });
  });

  it("refuses your own username", () => {
    expect(decideSendRequest(facts({ target: { id: "a", blockedAt: null } }), NOW)).toEqual(error(FRIEND_MESSAGES.self));
  });

  it("says no such player for an unknown name, an admin-blocked player and a player who blocked you alike", () => {
    expect(decideSendRequest(facts({ target: null }), NOW)).toEqual(error(FRIEND_MESSAGES.noSuchPlayer));
    expect(decideSendRequest(facts({ target: { id: "b", blockedAt: new Date(NOW) } }), NOW)).toEqual(error(FRIEND_MESSAGES.noSuchPlayer));
    expect(decideSendRequest(facts({ targetBlockedMe: true }), NOW)).toEqual(error(FRIEND_MESSAGES.noSuchPlayer));
  });

  it("asks you to unblock them first", () => {
    expect(decideSendRequest(facts({ iBlockedTarget: true }), NOW)).toEqual(error(FRIEND_MESSAGES.unblockFirst));
  });

  it("refuses when already friends", () => {
    expect(decideSendRequest(facts({ alreadyFriends: true }), NOW)).toEqual(error(FRIEND_MESSAGES.alreadyFriends));
  });

  it("refuses a second request while one waits", () => {
    expect(decideSendRequest(facts({ mySent: { status: "PENDING", respondedAt: null } }), NOW)).toEqual(error(FRIEND_MESSAGES.alreadySent));
  });

  it("hides a decline for 7 days, then lets the request go again", () => {
    const justDeclined = { status: "DECLINED" as const, respondedAt: new Date(NOW - DECLINE_HOLD_MS + 1) };
    expect(decideSendRequest(facts({ mySent: justDeclined }), NOW)).toEqual(error(FRIEND_MESSAGES.alreadySent));
    const longAgo = { status: "DECLINED" as const, respondedAt: new Date(NOW - DECLINE_HOLD_MS) };
    expect(decideSendRequest(facts({ mySent: longAgo }), NOW)).toEqual({ kind: "revive" });
  });

  it("accepts a request they already sent you, even at the sending limits", () => {
    const cross = { theirSent: { status: "PENDING" as const }, myPendingSent: MAX_PENDING_SENT, mySentInWindow: MAX_REQUESTS_PER_DAY };
    expect(decideSendRequest(facts(cross), NOW)).toEqual({ kind: "accept-cross" });
  });

  it("does not accept a request they already declined", () => {
    expect(decideSendRequest(facts({ theirSent: { status: "DECLINED" } }), NOW)).toEqual({ kind: "create" });
  });

  it("refuses when either list is full", () => {
    expect(decideSendRequest(facts({ myFriendCount: MAX_FRIENDS }), NOW)).toEqual(error(FRIEND_MESSAGES.listFull));
    expect(decideSendRequest(facts({ theirFriendCount: MAX_FRIENDS }), NOW)).toEqual(error(FRIEND_MESSAGES.listFull));
    expect(decideSendRequest(facts({ myFriendCount: MAX_FRIENDS - 1, theirFriendCount: MAX_FRIENDS - 1 }), NOW)).toEqual({ kind: "create" });
  });

  it("refuses the 21st waiting request and the 31st in a day", () => {
    expect(decideSendRequest(facts({ myPendingSent: MAX_PENDING_SENT - 1 }), NOW)).toEqual({ kind: "create" });
    expect(decideSendRequest(facts({ myPendingSent: MAX_PENDING_SENT }), NOW)).toEqual(error(FRIEND_MESSAGES.tooManyWaiting));
    expect(decideSendRequest(facts({ mySentInWindow: MAX_REQUESTS_PER_DAY - 1 }), NOW)).toEqual({ kind: "create" });
    expect(decideSendRequest(facts({ mySentInWindow: MAX_REQUESTS_PER_DAY }), NOW)).toEqual(error(FRIEND_MESSAGES.tooManyToday));
  });
});

describe("declineHolds", () => {
  it("holds inside 7 days and not after", () => {
    expect(declineHolds(null, NOW)).toBe(false);
    expect(declineHolds(new Date(NOW - 1), NOW)).toBe(true);
    expect(declineHolds(new Date(NOW - DECLINE_HOLD_MS), NOW)).toBe(false);
  });
});

describe("isOnline", () => {
  it("is a page load inside the last 5 minutes", () => {
    expect(isOnline(new Date(NOW - ONLINE_WINDOW_MS + 1), null, NOW)).toBe(true);
    expect(isOnline(new Date(NOW - ONLINE_WINDOW_MS), null, NOW)).toBe(false);
    expect(isOnline(null, null, NOW)).toBe(false);
    expect(isOnline(undefined, null, NOW)).toBe(false);
  });

  it("never shows an admin-blocked player online", () => {
    expect(isOnline(new Date(NOW), new Date(NOW), NOW)).toBe(false);
  });
});

describe("sortFriends", () => {
  it("puts online friends first, each part by username A to Z", () => {
    const sorted = sortFriends([
      { username: "zed", online: false },
      { username: "bob", online: true },
      { username: "amy", online: false },
      { username: "cat", online: true },
    ]);
    expect(sorted.map((f) => f.username)).toEqual(["bob", "cat", "amy", "zed"]);
  });
});

describe("standingOf", () => {
  const base: StandingFacts = { viewerId: "a", otherId: "b", friends: false, blockedEitherWay: false, sent: null, received: null };

  it("hides the button on your own page and across a block", () => {
    expect(standingOf({ ...base, otherId: "a" })).toBe("hidden");
    expect(standingOf({ ...base, blockedEitherWay: true, friends: true })).toBe("hidden");
  });

  it("reads friends, received, sent and none", () => {
    expect(standingOf({ ...base, friends: true })).toBe("friends");
    expect(standingOf({ ...base, received: { status: "PENDING" } })).toBe("received");
    expect(standingOf({ ...base, sent: { status: "PENDING" } })).toBe("sent");
    expect(standingOf(base)).toBe("none");
  });

  it("still reads a declined request as sent", () => {
    expect(standingOf({ ...base, sent: { status: "DECLINED" } })).toBe("sent");
    // A request they declined of ours, and one of theirs we declined: ours still shows sent, theirs shows nothing.
    expect(standingOf({ ...base, received: { status: "DECLINED" } })).toBe("none");
  });
});
