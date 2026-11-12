"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { BellRing } from "lucide-react";
import { toast } from "sonner";

import { registerWorker, pushSupported, turnOnThisDevice } from "@/components/push-device";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pill } from "@/components/ui/pill";

/** In localStorage once answered, so it asks once on each device. */
const KEY = "push-prompt";

// Nothing changes it from outside; the dialog's own state takes over once it is answered.
const subscribe = () => () => {};

function unasked() {
  try {
    return pushSupported() && Notification.permission === "default" && !localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

/**
 * Asks once, on the Friends screen, whether friend requests and room invites should reach this device.
 * Only for a player with friends or requests, with the switch on, and never asks the browser before Turn on.
 */
export function PushPrompt({ wanted }: { wanted: boolean }) {
  const open = useSyncExternalStore(subscribe, unasked, () => false);
  const [answered, setAnswered] = useState(false);
  const asking = wanted && open && !answered;

  useEffect(() => {
    if (asking) registerWorker();
  }, [asking]);

  const done = () => {
    setAnswered(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  };

  const turnOn = async () => {
    done();
    const turned = await turnOnThisDevice();
    if (turned.result === "on") toast.success("Notifications are on for this device.");
    if (turned.result === "blocked") toast.error("Notifications are blocked in this browser's settings.");
    if (turned.result === "failed") toast.error("Notifications couldn't be turned on. Try again from Profile settings.", { description: turned.reason });
  };

  return (
    <Dialog open={asking} onOpenChange={(next) => !next && done()}>
      <DialogContent className="theme-cosmos dark gap-4 border-2 border-gold-400 sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <BellRing className="size-10 text-gold-400" />
          <DialogTitle>Get told when a friend invites you?</DialogTitle>
          <DialogDescription>Friend requests and room invites reach this device, even with the game closed. Change it any time in Profile settings.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-3">
          <Pill className="flex-1" onClick={done}>
            Not now
          </Pill>
          <Pill tone="gold" className="flex-1" onClick={() => void turnOn()}>
            Turn on
          </Pill>
        </div>
      </DialogContent>
    </Dialog>
  );
}
