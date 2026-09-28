import type { Viewport } from "next";
import { redirect } from "next/navigation";

import { GameBoardClient } from "@/components/game/GameBoardClient";
import { auth0 } from "@/lib/auth0";
import { pageMetadata } from "@/lib/site";

// Let the board draw under the phone's notch / rounded-corner margins; the
// `.game-board` rule in globals.css pads the content back out of them.
export const viewport: Viewport = { viewportFit: "cover" };

export const metadata = pageMetadata("Game", undefined, true);

// The game board (ARCHITECTURE.md §6: `play/[gameId]/page.tsx`, "both
// modes"). Deliberately does not fetch the game here — GameBoardClient owns
// that as the single source of truth, since it also needs to re-fetch after
// every move.
export default async function PlayPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;

  const session = await auth0.getSession();
  if (!session) {
    redirect(`/auth/login?returnTo=/play/${gameId}`);
  }

  return <GameBoardClient gameId={gameId} />;
}
