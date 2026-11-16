"use client";

import { useEffect, useRef, useState } from "react";
import { UserPlus } from "lucide-react";
import { cn } from "cn";
import { toast } from "sonner";

import { Who } from "@/components/friends/FriendsScreen";
import { ROUND_BUTTON } from "@/components/lobby/ShareCode";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pill } from "@/components/ui/pill";
import type { FriendResult } from "@/lib/friends";
import { canResend } from "@/lib/invite-rules";
import type { InvitableFriend } from "@/lib/invites";

/**
 * The round button beside the room code, and its dialog of friends to invite, online first.
 * An unanswered invite can be sent again after a minute; a declined one can't. The dialog closes
 * itself once the room is full or an invited friend sits down.
 */
export function InviteFriends({ friends, full, onInvite }: { friends: InvitableFriend[]; full: boolean; onInvite: (friendId: string) => Promise<FriendResult> }) {
  const [open, setOpen] = useState(false);
  // Sent from this dialog, by friend; the page's own list catches up on its next refresh.
  const [sentAt, setSentAt] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const waiting = useRef(new Map<string, string>());
  const [shown, setShown] = useState(friends);

  // A new list from the page: an invited friend who left it has sat down, so the dialog closes. A full room closes it too, below.
  if (shown !== friends) {
    setShown(friends);
    if (shown.some((f) => f.invite?.status === "PENDING" && !friends.some((g) => g.id === f.id))) setOpen(false);
  }

  // Ticks while open, so Invited turns to Resend when its minute is up.
  useEffect(() => {
    if (!open) return;
    const tick = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(tick);
  }, [open]);

  // Tells the seated players when a friend they were waiting on declines.
  useEffect(() => {
    for (const [id, username] of waiting.current) {
      if (friends.find((f) => f.id === id)?.invite?.status === "DECLINED") toast(`${username} declined the invite`);
    }
    waiting.current = new Map(friends.filter((f) => f.invite?.status === "PENDING").map((f) => [f.id, f.username]));
  }, [friends]);

  const invite = async (friendId: string) => {
    setBusy(friendId);
    try {
      const result = await onInvite(friendId);
      if ("error" in result) toast.error(result.error);
      else setSentAt((at) => ({ ...at, [friendId]: Date.now() }));
    } catch {
      toast.error("That didn't go through. Try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open && !full} onOpenChange={setOpen}>
      <DialogTrigger disabled={full} aria-label="Invite friends" className={cn(ROUND_BUTTON, "disabled:pointer-events-none disabled:opacity-50")}>
        <UserPlus className="size-5" />
      </DialogTrigger>
      <DialogContent className="theme-cosmos dark max-h-[calc(var(--screen-h)*0.9)] gap-4 overflow-y-auto border-2 border-gold-400 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite friends</DialogTitle>
          <DialogDescription>They see the room first, then choose Join or Decline.</DialogDescription>
        </DialogHeader>
        {friends.length === 0 ? (
          <p className="py-4 text-center font-bold text-cosmos-300">Add friends from the home screen.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {friends.map((friend) => {
              const declined = friend.invite?.status === "DECLINED";
              const waitingAt = friend.invite?.status === "PENDING" ? friend.invite.sentAt : null;
              const mine = sentAt[friend.id];
              const sent = mine === undefined ? waitingAt : Math.max(mine, waitingAt ?? 0);
              const label = declined ? "Declined" : sent === null ? "Invite" : canResend(sent, now) ? "Resend" : "Invited";
              return (
                <li key={friend.id} className="flex items-center gap-3 rounded-2xl bg-cosmos-950 p-2 ring-2 ring-cosmos-500 ring-inset">
                  <Who player={friend} online={friend.online} />
                  <Pill
                    tone={label === "Invite" || label === "Resend" ? "gold" : undefined}
                    disabled={label === "Declined" || label === "Invited" || busy !== null}
                    onClick={() => void invite(friend.id)}
                    className={cn("h-9 px-4 text-xs", declined && "disabled:text-red-300")}
                  >
                    {label}
                  </Pill>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
