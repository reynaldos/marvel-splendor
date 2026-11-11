"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useFriendUpdates } from "@/components/friends/use-friend-updates";
import { PlayerAvatar } from "@/components/profile/PlayerAvatar";
import { Pill } from "@/components/ui/pill";
import type { FriendPlayer, FriendResult, FriendsView, InviteEntry } from "@/lib/friends";

/** Notices already shown in this tab, so a reload doesn't repeat them. */
const SEEN_KEY = "friend-notices-seen";

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function writeSeen(seen: Set<string>) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    // Storage off: a reload may show a notice again.
  }
}

/** How long a friend notice stays before it hides itself. */
const NOTICE_MS = 30_000;

/** One friend notice: who, what, one line under it, Decline and the way to look. Top centre, clear of the menu screens' buttons. */
function Notice({
  id,
  from,
  what,
  line,
  label,
  onView,
  onDecline,
}: {
  id: string;
  from: FriendPlayer;
  what: string;
  line?: string;
  label: string;
  onView: () => void;
  onDecline: () => void;
}) {
  const close = (then: () => void) => () => {
    toast.dismiss(id);
    then();
  };
  return (
    <div className="theme-cosmos dark flex w-(--width) max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full bg-cosmos-900/95 p-1.5 pr-2 text-white shadow-[0_0_24px] shadow-gold-400/30 ring-2 ring-gold-400 ring-inset backdrop-blur">
      <PlayerAvatar src={from.avatarUrl} name={from.username} className="size-11 shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-sm font-black">
          <span className="text-gold-400">{from.username}</span> {what}
        </span>
        {line ? <span className="truncate text-xs font-bold text-cosmos-300">{line}</span> : null}
      </span>
      <button type="button" onClick={close(onDecline)} className="h-9 shrink-0 rounded-full px-2 text-xs font-bold text-cosmos-300 hover:text-white">
        Decline
      </button>
      <Pill tone="gold" onClick={close(onView)} className="h-9 shrink-0 px-3.5 text-xs">
        {label}
      </Pill>
    </div>
  );
}

/** The toast for a room invite. It never seats anyone: View room opens the room with its Join question. */
export function showInviteToast(invite: InviteEntry, onView: () => void, onDecline: () => void) {
  // A resend has a new time, so it shows again.
  const id = `invite-${invite.id}-${invite.sentAt}`;
  toast.custom(() => <Notice id={id} from={invite.from} what="invited you" line={invite.line} label="View room" onView={onView} onDecline={onDecline} />, {
    id,
    duration: NOTICE_MS,
    position: "top-center",
  });
}

/** The toast for a friend request. */
export function showRequestToast(requestId: string, from: FriendPlayer, onView: () => void, onDecline: () => void) {
  const id = `request-${requestId}`;
  toast.custom(() => <Notice id={id} from={from} what="wants to be friends" label="View" onView={onView} onDecline={onDecline} />, {
    id,
    duration: NOTICE_MS,
    position: "top-center",
  });
}

/** A Decline from a notice: a refusal says why; the action itself refreshes the page's dot. */
async function answer(sent: Promise<FriendResult>) {
  try {
    const result = await sent;
    if ("error" in result) toast.error(result.error);
  } catch {
    toast.error("That didn't go through. Try again.");
  }
}

/**
 * Tells a player on a menu screen when a room invite or a friend request arrives, and keeps the
 * page's waiting dot current. Each notice shows once per tab; one that comes while the tab is hidden waits.
 */
export function FriendNotices({
  userId,
  declineInvite,
  respondRequest,
}: {
  userId: string;
  declineInvite: (inviteId: string) => Promise<FriendResult>;
  respondRequest: (requestId: string, accept: boolean) => Promise<FriendResult>;
}) {
  const router = useRouter();
  const lastWaiting = useRef<number | null>(null);

  const check = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    let view: FriendsView;
    try {
      const response = await fetch("/api/friends", { cache: "no-store" });
      if (!response.ok) return;
      view = (await response.json()) as FriendsView;
    } catch {
      return;
    }

    const seen = readSeen();
    // Already looking at it: the invite's own room, or the Friends screen's lists.
    const openInvite = new URLSearchParams(window.location.search).get("invite");
    const onFriends = window.location.pathname === "/friends";
    for (const invite of view.invites) {
      const key = `invite-${invite.id}-${invite.sentAt}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (invite.id !== openInvite) showInviteToast(invite, () => router.push(`/lobby/${invite.gameId}?invite=${invite.id}`), () => void answer(declineInvite(invite.id)));
    }
    for (const request of view.received) {
      const key = `request-${request.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!onFriends) showRequestToast(request.id, request.from, () => router.push("/friends"), () => void answer(respondRequest(request.id, false)));
    }
    writeSeen(seen);

    // The home dot and the lists come from the server, so a change re-renders the page.
    if (lastWaiting.current !== null && lastWaiting.current !== view.waiting) router.refresh();
    lastWaiting.current = view.waiting;
  }, [router, declineInvite, respondRequest]);

  useEffect(() => {
    void check();
  }, [check]);
  useFriendUpdates(userId, () => void check());

  return null;
}
