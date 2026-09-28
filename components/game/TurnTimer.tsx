"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";

interface TurnTimerProps {
  /** When the turn runs out, on this device's clock; null = untimed, render nothing. */
  endsAt: number | null;
  /** The turn's full length; the count holds here until the turn banner has gone. */
  seconds: number | null;
}

/**
 * Countdown to a deadline the server set, so every device shows the same
 * time left. Presentational only — GameBoardClient ends the turn.
 */
export function TurnTimer({ endsAt, seconds }: TurnTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, []);

  if (endsAt === null) return null;
  const remaining = Math.min(seconds ?? Infinity, Math.max(0, Math.ceil((endsAt - now) / 1000)));

  return (
    <div
      className={cn(
        "flex size-7 items-center justify-center rounded-full fs-2xs font-bold tabular-nums ring-2",
        remaining <= 5 ? "text-destructive ring-destructive" : "text-foreground ring-foreground/20",
      )}
      title="Turn time remaining"
    >
      {remaining}
    </div>
  );
}
