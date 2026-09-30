"use client";

import { useEffect, useState } from "react";

const secondsLeft = (until: number) => Math.max(0, Math.ceil((until - Date.now()) / 1000));

/** Seconds left for the host to come back, counting down under their seat. */
export function AwayTimer({ until }: { until: number }) {
  const [seconds, setSeconds] = useState(() => secondsLeft(until));
  useEffect(() => {
    const tick = setInterval(() => setSeconds(secondsLeft(until)), 250);
    return () => clearInterval(tick);
  }, [until]);
  return (
    <span className="flex h-7 items-center rounded-full bg-cosmos-950 px-3 text-xs font-bold text-cosmos-300 uppercase tabular-nums">
      Away · {seconds}s
    </span>
  );
}
