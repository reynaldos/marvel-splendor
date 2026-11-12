"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { setPushEnabledAction } from "@/app/push/actions";
import { onIphoneBrowser } from "@/components/AddToHomeScreen";
import { deviceSubscribed, registerWorker, pushConfigured, pushSupported, turnOnThisDevice } from "@/components/push-device";
import { Toggle } from "@/components/Toggle";
import { Pill } from "@/components/ui/pill";

type Device = "checking" | "on" | "off" | "blocked" | "unsupported" | "iphone";

const NOTE = "col-span-2 text-sm font-bold text-cosmos-300";
/** What this device still needs, under the switch. */
const NOTES = {
  blocked: "Notifications are blocked in this browser's settings.",
  iphone: "Add the game to your Home Screen to get notifications on this iPhone.",
  unsupported: "This browser can't show notifications.",
};

/** What this device can do about notifications, known only in the browser. */
async function deviceState(): Promise<Device> {
  if (!pushSupported()) {
    const nav = navigator as Navigator & { standalone?: boolean };
    return onIphoneBrowser(nav.userAgent, nav.standalone === true) ? "iphone" : "unsupported";
  }
  if (Notification.permission === "denied") return "blocked";
  return (await deviceSubscribed()) ? "on" : "off";
}

/**
 * The Notifications switch on Profile settings: the account's on or off, on by default.
 * Under it, what this device still needs, as notifications are allowed one device at a time.
 */
export function PushToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [device, setDevice] = useState<Device>("checking");

  useEffect(() => {
    registerWorker();
    void deviceState().then(setDevice);
  }, []);

  if (!pushConfigured) return null;

  const allow = async () => {
    const turned = await turnOnThisDevice();
    if (turned.result === "blocked") toast.error("Notifications are blocked in this browser's settings.");
    if (turned.result === "failed") toast.error("Notifications couldn't be turned on.", { description: turned.reason });
    setDevice(turned.result === "on" ? "on" : turned.result === "blocked" ? "blocked" : "off");
  };

  const change = (next: boolean) => {
    setOn(next);
    void setPushEnabledAction(next).catch(() => {
      setOn(!next);
      toast.error("That didn't go through. Try again.");
    });
    if (next && device === "off") void allow();
  };

  return (
    <>
      <Toggle on={on} onChange={change} label="Notifications" />
      {on && device === "off" ? (
        <Pill tone="gold" onClick={() => void allow()} className="col-span-2">
          Allow on this device
        </Pill>
      ) : null}
      {on && device in NOTES ? <p className={NOTE}>{NOTES[device as keyof typeof NOTES]}</p> : null}
    </>
  );
}
