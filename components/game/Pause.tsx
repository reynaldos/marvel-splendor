"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Pauses or resumes a game against bots; the turn clock's time left on a resume, or null when it failed. */
export async function setPaused(gameId: string, paused: boolean): Promise<{ turnEndsInMs: number | null } | null> {
  // Sent as the tab goes into the background too, so it must outlive the page.
  const res = await fetch(`/api/games/${gameId}/pause`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paused }), keepalive: true });
  return res.ok ? ((await res.json()) as { turnEndsInMs: number | null }) : null;
}

/** Pauses the game as the tab goes into the background, while `on`: a game against bots waits for its player. */
export function usePauseWhenHidden(on: boolean, pause: () => void) {
  useEffect(() => {
    if (!on) return;
    const onHide = () => {
      if (document.visibilityState === "hidden") pause();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [on, pause]);
}

/** Over a paused board: resume, or go home and come back later. */
export function PausedNotice({ className, busy, onResume }: { className: string; busy: boolean; onResume: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-xs">
      <div className={className}>
        <p className="font-display text-base font-bold tracking-wide text-gold-400 uppercase">Game paused</p>
        <p className="text-xs text-muted-foreground">The turn clock starts over when you resume. Your game is waiting on the home screen.</p>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/">Back to home</Link>
          </Button>
          <Button disabled={busy} onClick={onResume}>
            Resume
          </Button>
        </div>
      </div>
    </div>
  );
}
