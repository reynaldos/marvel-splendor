"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  screen.orientation?.addEventListener("change", onChange);
  return () => screen.orientation?.removeEventListener("change", onChange);
}

// "landscape-primary" is the phone turned counter-clockwise: its top, and notch, on the left.
function getSide(): "left" | "right" | undefined {
  const type = screen.orientation?.type;
  if (type === "landscape-primary") return "left";
  if (type === "landscape-secondary") return "right";
  return undefined;
}

/** Which side a landscape phone's notch is on, so the far side can use its margin. */
export function useNotchSide() {
  return useSyncExternalStore(subscribe, getSide, () => undefined);
}
