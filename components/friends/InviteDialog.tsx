"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PlayerAvatar } from "@/components/profile/PlayerAvatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pill } from "@/components/ui/pill";
import type { FriendPlayer, FriendResult } from "@/lib/friends";

/**
 * The question over a room the player was invited to. It can't be closed: Join seats them and opens
 * the live lobby, Decline goes home.
 */
export function InviteDialog({
  gameId,
  from,
  line,
  onRespond,
  onDone,
}: {
  gameId: string;
  from: FriendPlayer;
  line: string;
  onRespond: (accept: boolean) => Promise<FriendResult>;
  /** In place of moving on; the preview stays put. */
  onDone?: (accept: boolean) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const answer = async (accept: boolean) => {
    setBusy(true);
    try {
      const result = await onRespond(accept);
      if ("error" in result) {
        toast.error(result.error);
        router.refresh();
        return setBusy(false);
      }
      if (onDone) {
        onDone(accept);
        return setBusy(false);
      }
      // Without `?invite=` the page is the seated lobby.
      if (accept) router.replace(`/lobby/${gameId}`);
      else router.push("/");
    } catch {
      toast.error("That didn't go through. Try again.");
      setBusy(false);
    }
  };

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        className="theme-cosmos dark gap-4 border-2 border-gold-400 sm:max-w-md"
      >
        <DialogHeader className="items-center text-center">
          <PlayerAvatar src={from.avatarUrl} name={from.username} className="size-16 text-2xl" />
          <DialogTitle>{from.username} invited you to a game</DialogTitle>
          <DialogDescription>{line}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-3">
          <Pill className="flex-1" disabled={busy} onClick={() => void answer(false)}>
            Decline
          </Pill>
          <Pill tone="gold" className="flex-1" disabled={busy} onClick={() => void answer(true)}>
            Join
          </Pill>
        </div>
      </DialogContent>
    </Dialog>
  );
}
