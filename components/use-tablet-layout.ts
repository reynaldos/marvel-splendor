"use client";

import { useSyncExternalStore } from "react";

// A screen short for its width: an iPad, an opened fold. globals.css sizes the board under the same query.
const TABLET = "(max-aspect-ratio: 164/100)";

function subscribe(onChange: () => void) {
  const query = matchMedia(TABLET);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** True on a tablet-shaped screen, where the board puts the other players across the top. */
export function useTabletLayout() {
  return useSyncExternalStore(subscribe, () => matchMedia(TABLET).matches, () => false);
}
