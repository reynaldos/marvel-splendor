"use client";

import { useSyncExternalStore } from "react";

const watchers = new Set<() => void>();

function subscribe(onChange: () => void) {
  watchers.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    watchers.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

// ponytail: remembered on the device, not the account. A column on User if it must follow the player.
function read(key: string, fallback: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    // Nowhere to remember it, so don't nag.
    return fallback;
  }
}

/** What this device last saw under `key`, or null if never; `fallback` while rendering on the server. */
export function useSeen(key: string, fallback: string) {
  return useSyncExternalStore(subscribe, () => read(key, fallback), () => fallback);
}

export function markSeen(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
  watchers.forEach((tell) => tell());
}
