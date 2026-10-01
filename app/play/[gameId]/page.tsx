import { redirect } from "next/navigation";

import { BgmPlayer } from "@/components/audio";
import { GameBoardClient } from "@/components/game/GameBoardClient";
import { auth0 } from "@/lib/auth0";
import { pageMetadata } from "@/lib/site";

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

  // The music plays at the table only; leaving the board stops it.
  return (
    <>
      <BgmPlayer />
      <GameBoardClient gameId={gameId} />
    </>
  );
}
