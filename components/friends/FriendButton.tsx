"use client";

import { useState } from "react";
import { Check, Clock, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pill } from "@/components/ui/pill";
import type { FriendStanding } from "@/lib/friend-rules";
import type { FriendResult } from "@/lib/friends";

/** Where the viewer stands with the profile's player, as the page worked it out. */
export interface FriendStandingProps {
  standing: Exclude<FriendStanding, "hidden">;
  /** The request behind "sent" or "received"; null otherwise. */
  requestId: string | null;
}

interface FriendButtonProps extends FriendStandingProps {
  userId: string;
  username: string;
  onSend: (username: string) => Promise<FriendResult>;
  onRespond: (requestId: string, accept: boolean) => Promise<FriendResult>;
  onCancel: (requestId: string) => Promise<FriendResult>;
  onRemove: (friendId: string) => Promise<FriendResult>;
}

/**
 * The one button on someone else's profile: Add friend, Request sent (tap to cancel),
 * Accept request, or Friends (tap to remove). The page re-renders it after each change.
 */
export function FriendButton({ standing, requestId, userId, username, onSend, onRespond, onCancel, onRemove }: FriendButtonProps) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const run = async (action: () => Promise<FriendResult>) => {
    setBusy(true);
    try {
      const result = await action();
      if ("error" in result) toast.error(result.error);
      else if (result.message) toast.success(result.message);
    } catch {
      toast.error("That didn't go through. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (standing === "friends") {
    return (
      <>
        <Pill disabled={busy} onClick={() => setConfirm(true)} aria-label={`Friends with ${username}. Tap to remove`}>
          <Check className="size-4 text-emerald-400" />
          Friends
        </Pill>
        <Dialog open={confirm} onOpenChange={setConfirm}>
          <DialogContent className="theme-cosmos dark gap-4 border-2 border-gold-400 sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Remove {username}?</DialogTitle>
              <DialogDescription>They leave your friends list, and you leave theirs. They won&apos;t be told.</DialogDescription>
            </DialogHeader>
            <div className="flex gap-3">
              <Pill className="flex-1" onClick={() => setConfirm(false)}>
                Keep them
              </Pill>
              <Pill
                tone="red"
                className="flex-1"
                onClick={() => {
                  setConfirm(false);
                  void run(() => onRemove(userId));
                }}
              >
                Remove
              </Pill>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
  if (standing === "received" && requestId) {
    return (
      <Pill tone="gold" disabled={busy} onClick={() => void run(() => onRespond(requestId, true))}>
        <UserPlus className="size-4" />
        Accept request
      </Pill>
    );
  }
  if (standing === "sent" && requestId) {
    return (
      <Pill disabled={busy} onClick={() => void run(() => onCancel(requestId))} aria-label="Request sent. Tap to cancel">
        <Clock className="size-4 text-gold-200" />
        Request sent
      </Pill>
    );
  }
  return (
    <Pill tone="gold" disabled={busy} onClick={() => void run(() => onSend(username))}>
      <UserPlus className="size-4" />
      Add friend
    </Pill>
  );
}
