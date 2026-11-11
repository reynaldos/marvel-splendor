// Made-up friends for the preview page, and a store whose actions follow the real send rules.
import { decideSendRequest, NOT_FOUND, sortFriends } from "@/lib/friend-rules";
import type { FriendEntry, FriendPlayer, FriendResult, FriendsView } from "@/lib/friends";
import { AVATAR_LIBRARY } from "@/lib/avatars";

/** The viewer, named as in the preview's top bar, so adding "preview" shows "That's you." */
export const SELF: FriendPlayer = { id: "p-self", username: "preview", name: null, avatarUrl: null };

const player = (n: number, username: string, name: string | null = null): FriendPlayer => ({
  id: `p-${username}`,
  username,
  name,
  avatarUrl: AVATAR_LIBRARY[n]?.src ?? null,
});

/** Everyone the fake store knows by username; the last two are only reachable by typing their name. */
export const PLAYERS = [
  player(0, "tonystark", "Tony"),
  player(1, "capfan"),
  player(2, "thunderer", "Thor"),
  player(3, "smash"),
  player(4, "natasha"),
  player(5, "webhead", "Peter"),
  player(6, "sorcerer"),
  player(7, "wanda"),
  player(8, "vizh"),
  player(9, "tinyhero"),
];
const [tony, cap, thor, hulk, nat, peter, strange, wanda] = PLAYERS;

/** The lists the page opens on: full, or every tab empty. */
export function fakeView(empty: boolean): FriendsView {
  if (empty) return { friends: [], received: [], sent: [], blocked: [], waiting: 0 };
  const friends: FriendEntry[] = sortFriends([
    { ...tony, online: true },
    { ...cap, online: false },
    { ...thor, online: true },
    { ...hulk, online: true },
    { ...nat, online: false },
  ]);
  return {
    friends,
    received: [
      { id: `in-${peter.id}`, from: peter },
      { id: `in-${strange.id}`, from: strange },
    ],
    sent: [{ id: `out-${wanda.id}`, to: wanda }],
    blocked: [PLAYERS[9]],
    waiting: 2,
  };
}

const wait = () => new Promise((resolve) => setTimeout(resolve, 300));

/** A store held outside React, so `load` always reads what the last action left. */
export function fakeStore(start: FriendsView) {
  let view = start;
  const save = (next: Omit<FriendsView, "waiting">, message?: string): FriendResult => {
    view = { ...next, friends: sortFriends(next.friends), waiting: next.received.length };
    return { ok: true, message };
  };
  const without = <T extends { id: string }>(rows: T[], id: string) => rows.filter((row) => row.id !== id);
  const befriend = (who: FriendPlayer) => [...view.friends, { ...who, online: false }];

  const send = async (typed: string): Promise<FriendResult> => {
    await wait();
    const username = typed.trim().toLowerCase();
    if (!username) return { error: "Type a username." };
    const target = username === SELF.username ? SELF : PLAYERS.find((p) => p.username === username);
    const id = target?.id ?? "";
    const theirs = view.received.find((r) => r.from.id === id);
    const decision = decideSendRequest({
      selfId: SELF.id,
      target: target ? { id, blockedAt: null } : null,
      targetBlockedMe: false,
      iBlockedTarget: view.blocked.some((p) => p.id === id),
      alreadyFriends: view.friends.some((f) => f.id === id),
      mySent: view.sent.some((r) => r.to.id === id) ? { status: "PENDING", respondedAt: null } : null,
      theirSent: theirs ? { status: "PENDING" } : null,
      myFriendCount: view.friends.length,
      theirFriendCount: 0,
      myPendingSent: view.sent.length,
      mySentInWindow: 0,
    });
    if (decision.kind === "error") return { error: decision.message };
    if (decision.kind === "accept-cross" && theirs) {
      return save({ ...view, friends: befriend(theirs.from), received: without(view.received, theirs.id) }, "You're now friends.");
    }
    return save({ ...view, sent: [{ id: `out-${id}`, to: target! }, ...view.sent] }, "Request sent.");
  };

  const respond = async (requestId: string, accept: boolean): Promise<FriendResult> => {
    await wait();
    const request = view.received.find((r) => r.id === requestId);
    if (!request) return { error: NOT_FOUND };
    const received = without(view.received, requestId);
    return accept ? save({ ...view, received, friends: befriend(request.from) }, "You're now friends.") : save({ ...view, received });
  };

  const cancel = async (requestId: string): Promise<FriendResult> => {
    await wait();
    return view.sent.some((r) => r.id === requestId) ? save({ ...view, sent: without(view.sent, requestId) }) : { error: NOT_FOUND };
  };

  const remove = async (friendId: string): Promise<FriendResult> => {
    await wait();
    return view.friends.some((f) => f.id === friendId) ? save({ ...view, friends: without(view.friends, friendId) }) : { error: NOT_FOUND };
  };

  const block = async (userId: string): Promise<FriendResult> => {
    await wait();
    const who = PLAYERS.find((p) => p.id === userId);
    if (!who) return { error: NOT_FOUND };
    return save({
      friends: without(view.friends, userId),
      received: view.received.filter((r) => r.from.id !== userId),
      sent: view.sent.filter((r) => r.to.id !== userId),
      blocked: [who, ...without(view.blocked, userId)],
    });
  };

  const unblock = async (userId: string): Promise<FriendResult> => {
    await wait();
    return view.blocked.some((p) => p.id === userId) ? save({ ...view, blocked: without(view.blocked, userId) }) : { error: NOT_FOUND };
  };

  return { load: async () => view, actions: { send, respond, cancel, remove, block, unblock } };
}
