"use client";

import { useEffect, useState } from "react";
import { Check, Coins, Lock, Timer } from "lucide-react";

import { playSfx } from "@/components/audio";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DAILY_BONUS, type DailyBonusState } from "@/lib/daily-bonus";

const TILE = "relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl ring-2 ring-inset";
/** Lies over a tile that can't be collected, carrying the lock, the stamp or the clock. */
const OVERLAY = "absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl bg-cosmos-950/75";
/** How long the burst stays on the tile, in ms. */
const BURST_MS = 1200;
/** Where each burst coin flies, as a point round the tile. */
const BURST = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * 2 * Math.PI;
  return { dx: `${Math.cos(angle) * 4.5}rem`, dy: `${Math.sin(angle) * 4.5}rem` };
});

/** The time until `at`, as h:mm:ss, counting down. */
function useCountdown(at: number | null): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (at === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [at]);
  if (at === null) return "";
  const left = Math.max(0, Math.floor((at - now) / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${Math.floor(left / 3600)}:${pad(Math.floor((left % 3600) / 60))}:${pad(left % 60)}`;
}

/**
 * The daily bonus: eight tiles, two rows of four. Today's is lit with the Collect button; the
 * others sit under an overlay with a lock, a stamp or the countdown to midnight UTC. Collecting
 * flares the tile and bursts coins out of it. Goes inside the top bar's dialog. `onClaim` pays out.
 */
export function DailyBonus({ state, onClaim }: { state: DailyBonusState; onClaim: () => Promise<number> }) {
  // The day just collected and what it paid, while the burst plays.
  const [burst, setBurst] = useState<{ day: number; paid: number } | null>(null);
  const next = (state.day % DAILY_BONUS.length) + 1;
  const countdown = useCountdown(state.unlocksAt);

  useEffect(() => {
    if (!burst) return;
    const id = setTimeout(() => setBurst(null), BURST_MS);
    return () => clearTimeout(id);
  }, [burst]);

  // The burst starts on the tap, not after the round trip; it comes off again if the server paid nothing.
  const collect = async (day: number) => {
    playSfx("recruit");
    setBurst({ day, paid: DAILY_BONUS[day - 1] });
    if ((await onClaim()) === 0) setBurst(null);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-base font-black tracking-widest text-gold-400 uppercase">Daily bonus</DialogTitle>
        <DialogDescription className="sr-only">Collect coins every day to climb the streak. Miss a day and it starts over.</DialogDescription>
      </DialogHeader>
      <ol className="grid grid-cols-4 gap-3">
        {DAILY_BONUS.map((amount, i) => {
          const day = i + 1;
          const stamped = state.claimable ? day < state.day : day <= state.day && day !== next;
          const today = state.claimable && day === state.day;
          const upcoming = !state.claimable && day === next;
          const bursting = burst?.day === day;
          return (
            <li
              key={day}
              className={`${TILE} ${today || bursting ? "bg-cosmos-700 ring-gold-400 shadow-[0_0_16px] shadow-gold-400/40" : "bg-cosmos-950 ring-cosmos-500"} ${bursting ? "bonus-flare" : ""}`}
            >
              <span className="fs-2xs font-black tracking-wide text-cosmos-300 uppercase">Day {day}</span>
              <span className="flex items-center gap-1 text-xl font-black text-gold-400 tabular-nums">
                <Coins className="size-5" />
                {amount}
              </span>
              {today ? (
                <button
                  type="button"
                  onClick={() => collect(day)}
                  className="mt-1 h-7 rounded-full bg-gold-400 px-3 text-xs font-black text-cosmos-950 uppercase hover:bg-gold-200"
                >
                  Collect
                </button>
              ) : null}
              {upcoming && !bursting ? (
                <span className={OVERLAY}>
                  <Timer className="size-6 text-gold-200" />
                  <span className="text-sm font-black text-white tabular-nums">{countdown}</span>
                </span>
              ) : stamped && !bursting ? (
                <span className={OVERLAY} aria-label="Collected">
                  <span className="flex size-10 items-center justify-center rounded-full bg-gold-400 text-cosmos-950 ring-4 ring-gold-400/30">
                    <Check className="size-6" strokeWidth={3} />
                  </span>
                </span>
              ) : !today && !bursting ? (
                <span className={OVERLAY} aria-label="Locked">
                  <Lock className="size-7 text-cosmos-300" />
                </span>
              ) : null}
              {bursting ? (
                <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  {BURST.map((at, j) => (
                    <Coins
                      key={j}
                      className="bonus-coin absolute size-4 text-gold-200"
                      style={{ "--dx": at.dx, "--dy": at.dy, animationDelay: `${j * 20}ms` } as React.CSSProperties}
                    />
                  ))}
                  <span className="bonus-float absolute font-display text-2xl font-black text-gold-200 drop-shadow-[0_2px_4px_rgb(0_0_0/0.8)]">
                    +{burst!.paid}
                  </span>
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </>
  );
}
