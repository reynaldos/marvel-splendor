"use client";

import { useEffect } from "react";

/** The game's 2:1 shape, at a size that fits most laptop screens. */
export const OPENING_SIZE = { width: 1280, height: 640 };

const DONE = "app-window-sized";

/**
 * The window size that gives the page `OPENING_SIZE`, allowing for the
 * window's own title bar and edges, and never larger than the screen.
 */
export function openingWindow(
  frame: { width: number; height: number },
  screen: { width: number; height: number },
) {
  return {
    width: Math.min(OPENING_SIZE.width + frame.width, screen.width),
    height: Math.min(OPENING_SIZE.height + frame.height, screen.height),
  };
}

/**
 * Sizes the window the first time the installed app is opened on a computer.
 * Only that once: afterwards the browser reopens it at whatever size the
 * player left it. Browsers that don't let an app size its window ignore this.
 */
export function AppWindow() {
  useEffect(() => {
    const installed = matchMedia("(display-mode: standalone)").matches;
    const computer = matchMedia("(pointer: fine)").matches;
    try {
      if (!installed || !computer || localStorage.getItem(DONE)) return;
      localStorage.setItem(DONE, "1");
    } catch {
      return;
    }
    const size = openingWindow(
      { width: outerWidth - innerWidth, height: outerHeight - innerHeight },
      { width: screen.availWidth, height: screen.availHeight },
    );
    resizeTo(size.width, size.height);
  }, []);

  return null;
}
