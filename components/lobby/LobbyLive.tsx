"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useGameUpdates } from "@/components/game/use-game-updates";

/**
 * Keeps the server-rendered lobby page live: re-renders it whenever the
 * game changes. When the host starts, that re-render is what redirects
 * everyone to the board. The host's copy also reports them leaving and
 * returning, and everyone's refreshes once the host's time away runs out,
 * which is when the page closes the room.
 */
export function LobbyLive({
  gameId,
  isHost,
  hostAwayUntil,
}: {
  gameId: string;
  isHost: boolean;
  /** When the room closes unless the host is back; null while they are in it. */
  hostAwayUntil: number | null;
}) {
  const router = useRouter();
  useGameUpdates(gameId, () => router.refresh());

  useEffect(() => {
    if (!isHost) return;
    // keepalive lets the "gone" report finish after the page is torn down.
    // ponytail: a leave and a quick return can land out of order; stamp reports and keep the newest if it shows up.
    const report = (away: boolean) =>
      fetch(`/api/games/${gameId}/presence`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ away }),
        keepalive: true,
      }).catch(() => {});
    const gone = () => report(true);
    report(false);
    window.addEventListener("pagehide", gone);
    return () => {
      window.removeEventListener("pagehide", gone);
      gone();
    };
  }, [gameId, isHost]);

  useEffect(() => {
    if (hostAwayUntil === null) return;
    const timer = setTimeout(() => router.refresh(), Math.max(0, hostAwayUntil - Date.now()) + 500);
    return () => clearTimeout(timer);
  }, [hostAwayUntil, router]);

  return null;
}
