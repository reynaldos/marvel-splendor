"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";

/** What the clock reads: minutes and seconds left, or that the last round is on. */
export function clockLabel(msLeft: number, lastRound: boolean): string {
  if (lastRound || msLeft <= 0) return "Final round";
  const seconds = Math.ceil(msLeft / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** The game clock, for games that have one. Counts down, then announces the final round. */
export function GameClock({ endsAt, lastRound }: { endsAt: number; lastRound: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const left = endsAt - now;
  return (
    <span
      title="Time left in the game"
      className={cn(
        "rounded-full bg-popover px-3 py-1 font-display text-xs font-bold tracking-wide tabular-nums shadow-md ring-2 ring-inset",
        lastRound || left <= 60_000 ? "text-destructive ring-destructive" : "text-gold-400 ring-cosmos-500",
      )}
    >
      {clockLabel(left, lastRound)}
    </span>
  );
}
