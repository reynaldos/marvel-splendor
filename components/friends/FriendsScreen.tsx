"use client";

import { useCallback, useState, type ComponentType, type FormEvent } from "react";
import Link from "next/link";
import { Ban, Inbox, Users } from "lucide-react";
import { cn } from "cn";
import { toast } from "sonner";

import { BackLink } from "@/components/BackLink";
import { InviteToRoom, type SendToRoom } from "@/components/friends/InviteToRoom";
import { useFriendUpdates } from "@/components/friends/use-friend-updates";
import { PlayerAvatar } from "@/components/profile/PlayerAvatar";
import { Stage } from "@/components/Stage";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pill } from "@/components/ui/pill";
import type { FriendEntry, FriendPlayer, FriendResult, FriendsView } from "@/lib/friends";

export type Tab = "friends" | "requests" | "blocked";
export const TAB_NAMES: Tab[] = ["friends", "requests", "blocked"];
const TABS: Array<{ tab: Tab; label: string; icon: ComponentType<{ className?: string }> }> = [
  { tab: "friends", label: "Friends", icon: Users },
  { tab: "requests", label: "Requests", icon: Inbox },
  { tab: "blocked", label: "Blocked", icon: Ban },
];

const TILE = "relative flex items-center gap-3 rounded-2xl p-2 text-left ring-2 ring-inset";
const UNLIT = "bg-cosmos-950 ring-cosmos-500 hover:bg-cosmos-700";
const LIT = "bg-cosmos-700 ring-gold-400 shadow-[0_0_16px] shadow-gold-400/40";
const HEADING = "font-display text-xs font-black tracking-widest text-gold-400 uppercase";
const LIST = "scroll-fade flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const EMPTY = "m-auto text-center text-base font-bold text-cosmos-300";
/** The small round button on a row: accept, decline, cancel, unblock. */
const ROW_BUTTON = "h-9 px-4 text-xs";

export interface FriendsActions {
  send: (username: string) => Promise<FriendResult>;
  respond: (requestId: string, accept: boolean) => Promise<FriendResult>;
  cancel: (requestId: string) => Promise<FriendResult>;
  remove: (friendId: string) => Promise<FriendResult>;
  block: (userId: string) => Promise<FriendResult>;
  unblock: (userId: string) => Promise<FriendResult>;
  declineInvite: (inviteId: string) => Promise<FriendResult>;
  inviteToRoom: SendToRoom;
}

interface FriendsScreenProps {
  /** The signed-in player, for their live channel; null keeps the screen off it, as on the preview. */
  userId: string | null;
  initial: FriendsView;
  actions: FriendsActions;
  initialTab?: Tab;
  /** Reads the lists in place of GET /api/friends; the preview hands in its fake store. */
  load?: () => Promise<FriendsView>;
}

/** A player on a row: picture, username, their name if set. */
export function Who({ player, online }: { player: FriendPlayer; online?: boolean }) {
  return (
    <>
      <PlayerAvatar src={player.avatarUrl} name={player.username} className="size-10" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5 truncate text-sm font-black">
          {online ? <span aria-label="Online" role="img" className="size-2.5 shrink-0 rounded-full bg-emerald-500 ring-2 ring-cosmos-950" /> : null}
          <span className="truncate">{player.username}</span>
        </span>
        {player.name ? <span className="truncate text-xs text-cosmos-300">{player.name}</span> : null}
      </span>
    </>
  );
}

/**
 * The Friends screen: Friends, Requests and Blocked down the left; the chosen tab's list in the middle,
 * scrolling in its own box; and the chosen friend on the right with the ways to view, remove and block them.
 */
export function FriendsScreen({ userId, initial, actions, initialTab = "friends", load }: FriendsScreenProps) {
  const [view, setView] = useState(initial);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  // Remove and Block share the screen's one dialog; two over each other left stale pointer locks on touch.
  const [confirm, setConfirm] = useState<{ what: "remove" | "block"; friend: FriendEntry } | null>(null);

  const refetch = useCallback(async () => {
    try {
      if (load) return setView(await load());
      const response = await fetch("/api/friends", { cache: "no-store" });
      if (response.ok) setView((await response.json()) as FriendsView);
    } catch {
      // Offline: what is on screen stays until the next try.
    }
  }, [load]);

  // A request or invite that arrives while the screen is open shows without a reload.
  useFriendUpdates(userId, () => void refetch());

  const chosen = view.friends.find((f) => f.id === chosenId) ?? null;

  /** Runs one change, says what happened, and reloads the lists. Nothing on screen changes until the server has. */
  const run = async (action: () => Promise<FriendResult>) => {
    setBusy(true);
    try {
      const result = await action();
      if ("error" in result) {
        toast.error(result.error);
        return false;
      }
      if (result.message) toast.success(result.message);
      await refetch();
      return true;
    } catch {
      toast.error("That didn't go through. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (await run(() => actions.send(typed))) setTyped("");
  };

  const confirmed = async () => {
    if (!confirm) return;
    const { what, friend } = confirm;
    setConfirm(null);
    if (await run(() => (what === "remove" ? actions.remove(friend.id) : actions.block(friend.id)))) setChosenId(null);
  };

  const waiting = view.waiting;

  return (
    <Stage>
      <div className="flex h-full w-full gap-3 px-4 pt-17 pb-3">
        {/* The tabs, with the way back under them. */}
        <nav className="flex w-40 shrink-0 flex-col justify-between gap-2">
          <ul className="flex flex-col gap-2">
            {TABS.map(({ tab: t, label, icon: Icon }) => (
              <li key={t}>
                <button
                  type="button"
                  aria-pressed={t === tab}
                  onClick={() => {
                    setTab(t);
                    setChosenId(null);
                  }}
                  className={cn(TILE, "w-full gap-2.5 py-2 fs-2xs font-bold tracking-wide uppercase outline-none focus-visible:ring-gold-400", t === tab ? LIT : UNLIT)}
                >
                  <Icon className="size-5 shrink-0 text-gold-200" />
                  {label}
                  {t === "requests" && waiting > 0 ? (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-400 px-1.5 text-xs font-black text-cosmos-950 tabular-nums">{waiting}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
          <BackLink />
        </nav>

        {/* The chosen tab. */}
        <section className="flex min-h-0 flex-1 flex-col gap-3">
          {tab === "friends" ? (
            <>
              <form onSubmit={(event) => void add(event)} className="flex h-12 shrink-0 items-center rounded-full bg-cosmos-950 p-1 ring-2 ring-cosmos-500 ring-inset">
                <input
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  aria-label="Username to add"
                  placeholder="Add a friend by username"
                  maxLength={30}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="h-full min-w-0 flex-1 bg-transparent px-4 text-base font-bold outline-none placeholder:font-sans placeholder:font-normal placeholder:text-cosmos-500"
                />
                <button
                  type="submit"
                  disabled={busy || !typed.trim()}
                  className="h-full rounded-full bg-gold-400 px-6 font-display text-sm font-black tracking-wide text-cosmos-950 uppercase outline-none hover:bg-gold-200 focus-visible:ring-2 focus-visible:ring-gold-200 disabled:bg-cosmos-700 disabled:text-cosmos-300"
                >
                  Add
                </button>
              </form>
              <ul className={LIST}>
                {view.friends.map((friend) => (
                  <li key={friend.id}>
                    <button
                      type="button"
                      aria-pressed={friend.id === chosenId}
                      onClick={() => setChosenId(friend.id)}
                      className={cn(TILE, "w-full outline-none focus-visible:ring-gold-400", friend.id === chosenId ? LIT : UNLIT)}
                    >
                      <Who player={friend} online={friend.online} />
                    </button>
                  </li>
                ))}
                {view.friends.length === 0 ? <li className={EMPTY}>No friends yet. Add one by their username.</li> : null}
              </ul>
            </>
          ) : tab === "requests" ? (
            <ul className={LIST}>
              {view.invites.length > 0 ? <li className={HEADING}>Room invites</li> : null}
              {view.invites.map((invite) => (
                <li key={invite.id} className={cn(TILE, UNLIT)}>
                  <PlayerAvatar src={invite.from.avatarUrl} name={invite.from.username} className="size-10" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-black">{invite.from.username} invited you</span>
                    <span className="truncate text-xs text-cosmos-300">{invite.line}</span>
                  </span>
                  <Pill tone="gold" asChild className={ROW_BUTTON}>
                    <Link href={`/lobby/${invite.gameId}?invite=${invite.id}`}>View room</Link>
                  </Pill>
                  <Pill disabled={busy} onClick={() => void run(() => actions.declineInvite(invite.id))} className={ROW_BUTTON}>
                    Decline
                  </Pill>
                </li>
              ))}
              {view.received.length > 0 ? <li className={cn(HEADING, view.invites.length > 0 && "mt-2")}>Received</li> : null}
              {view.received.map((request) => (
                <li key={request.id} className={cn(TILE, UNLIT)}>
                  <Who player={request.from} />
                  <Pill tone="gold" disabled={busy} onClick={() => void run(() => actions.respond(request.id, true))} className={ROW_BUTTON}>
                    Accept
                  </Pill>
                  <Pill disabled={busy} onClick={() => void run(() => actions.respond(request.id, false))} className={ROW_BUTTON}>
                    Decline
                  </Pill>
                </li>
              ))}
              {view.sent.length > 0 ? <li className={cn(HEADING, view.received.length > 0 && "mt-2")}>Sent</li> : null}
              {view.sent.map((request) => (
                <li key={request.id} className={cn(TILE, UNLIT)}>
                  <Who player={request.to} />
                  <Pill disabled={busy} onClick={() => void run(() => actions.cancel(request.id))} className={ROW_BUTTON}>
                    Cancel
                  </Pill>
                </li>
              ))}
              {view.invites.length === 0 && view.received.length === 0 && view.sent.length === 0 ? <li className={EMPTY}>Nothing waiting.</li> : null}
            </ul>
          ) : (
            <ul className={LIST}>
              {view.blocked.map((player) => (
                <li key={player.id} className={cn(TILE, UNLIT)}>
                  <Who player={player} />
                  <Pill disabled={busy} onClick={() => void run(() => actions.unblock(player.id))} className={ROW_BUTTON}>
                    Unblock
                  </Pill>
                </li>
              ))}
              {view.blocked.length === 0 ? <li className={EMPTY}>You haven&apos;t blocked anyone.</li> : null}
            </ul>
          )}
        </section>

        {/* The chosen friend. */}
        <section className="flex w-64 shrink-0 flex-col items-center gap-2.5 rounded-2xl bg-cosmos-950/80 p-4 text-center ring-3 ring-cosmos-500 ring-inset">
          {chosen ? (
            <>
              {/* Where their picture was: the way to play with them. */}
              <InviteToRoom friendId={chosen.id} username={chosen.username} onSend={actions.inviteToRoom} />
              <p className="w-full shrink-0 truncate text-lg font-black text-gold-400">{chosen.name ?? chosen.username}</p>
              {chosen.name ? <p className="-mt-2 w-full shrink-0 truncate text-sm font-bold">@{chosen.username}</p> : null}
              <p className={cn("shrink-0 text-xs font-bold tracking-wide uppercase", chosen.online ? "text-emerald-400" : "text-cosmos-300")}>{chosen.online ? "Online" : "Offline"}</p>
              <Pill asChild className="mt-auto w-full">
                <Link href={`/profile/${chosen.username}`}>View profile</Link>
              </Pill>
              <Pill disabled={busy} onClick={() => setConfirm({ what: "remove", friend: chosen })} className="w-full">
                Remove
              </Pill>
              <Pill tone="red" disabled={busy} onClick={() => setConfirm({ what: "block", friend: chosen })} className="w-full">
                Block
              </Pill>
            </>
          ) : (
            <p className={EMPTY}>{tab === "friends" ? (view.friends.length > 0 ? "Pick a friend" : "Friends you add show here") : "Pick a friend on the Friends tab"}</p>
          )}
        </section>
      </div>

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent className="theme-cosmos dark gap-4 border-2 border-gold-400 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirm?.what === "block" ? `Block ${confirm.friend.username}?` : `Remove ${confirm?.friend.username}?`}</DialogTitle>
            <DialogDescription>
              {confirm?.what === "block"
                ? "They leave your friends, and neither of you can send the other a request. They won't be told."
                : "They leave your friends list, and you leave theirs. They won't be told."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <Pill className="flex-1" onClick={() => setConfirm(null)}>
              Keep them
            </Pill>
            <Pill tone="red" className="flex-1" onClick={() => void confirmed()}>
              {confirm?.what === "block" ? "Block" : "Remove"}
            </Pill>
          </div>
        </DialogContent>
      </Dialog>
    </Stage>
  );
}
