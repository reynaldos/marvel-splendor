"use client";

import { useRouter } from "next/navigation";

import { useGameUpdates } from "@/components/game/use-game-updates";

/**
 * Keeps the server-rendered lobby page live: re-renders it whenever the
 * game changes. When the host starts, that re-render is what redirects
 * everyone to the board.
 */
export function LobbyLive({ gameId }: { gameId: string }) {
  const router = useRouter();
  useGameUpdates(gameId, () => router.refresh());
  return null;
}
