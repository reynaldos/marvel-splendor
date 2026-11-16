"use client";

import { savePushDeviceAction } from "@/app/push/actions";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** Whether the game has push set up at all; without the keys nothing about notifications shows. */
export const pushConfigured = Boolean(PUBLIC_KEY);

/** Whether this browser can take push. An iPhone can only once the game is on the Home Screen. */
export function pushSupported(): boolean {
  return pushConfigured && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** The VAPID key as the browser wants it. */
function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const raw = atob((base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Whether this device already takes the game's notifications. */
export async function deviceSubscribed(): Promise<boolean> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return Boolean(await registration?.pushManager.getSubscription());
}

export type TurnOn = { result: "on" } | { result: "blocked" } | { result: "failed"; reason: string };

let registered = false;

/**
 * Registers the service worker once, as a menu screen loads, so it is active long before any tap.
 * Registering inside the tap fetches the worker first, and on iPhone that wait outlasts the tap,
 * so subscribing then fails with "User denied push permission".
 */
export function registerWorker(): void {
  if (registered || !pushSupported()) return;
  registered = true;
  navigator.serviceWorker.register("/sw.js").catch((error) => console.error("Push worker failed", error));
}

/**
 * Turns this device on, from a tap: permission first while the tap still counts, then the
 * already-active worker, then the subscription. A failure says which step.
 */
export async function turnOnThisDevice(): Promise<TurnOn> {
  if ((await Notification.requestPermission()) !== "granted") return { result: "blocked" };
  registerWorker();
  let step = "Subscribing with the browser's push service";
  try {
    const worker = await navigator.serviceWorker.ready;
    const subscription = await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY!) });
    step = "Saving this device";
    const saved = await savePushDeviceAction(subscription.toJSON());
    return "ok" in saved ? { result: "on" } : { result: "failed", reason: `${step}: ${saved.error}` };
  } catch (error) {
    if (Notification.permission === "denied") return { result: "blocked" };
    console.error(`Push setup failed. ${step}:`, error);
    return { result: "failed", reason: `${step} failed${error instanceof Error && error.message ? `: ${error.message}` : "."}` };
  }
}
