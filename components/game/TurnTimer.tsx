"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";

interface TurnTimerProps {
  /** null = untimed; render nothing. */
  turnTimeSeconds: number | null;
  /** Change this whenever the active turn changes to reset the countdown. */
  turnKey: string;
}

/**
 * Presentational, best-effort countdown only (ARCHITECTURE.md §5: real
 * enforcement is a Phase-2 `claim-timeout` backstop, not this component's
 * job). Never auto-submits anything — it's purely a visual cue that resets
 * whenever `turnKey` changes.
 */
export function TurnTimer({ turnTimeSeconds, turnKey }: TurnTimerProps) {
  if (turnTimeSeconds === null) return null;
  return <TurnTimerCountdown key={turnKey} seconds={turnTimeSeconds} />;
}

function TurnTimerCountdown({ seconds }: { seconds: number }) {
  // `seconds` only ever changes when the parent remounts this component via
  // `key={turnKey}` (see `TurnTimer` above), so lazy-initializing from it
  // here — rather than resyncing in an effect — is enough to reset the
  // countdown every turn.
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const low = remaining <= Math.min(5, seconds / 3);

  return (
    <div
      className={cn(
        "flex size-7 items-center justify-center rounded-full fs-2xs font-bold tabular-nums ring-2",
        low ? "text-destructive ring-destructive" : "text-foreground ring-foreground/20",
      )}
      title="Turn time remaining (visual only — not enforced client-side)"
    >
      {remaining}
    </div>
  );
}
