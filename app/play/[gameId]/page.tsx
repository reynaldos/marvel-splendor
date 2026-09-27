import { redirect } from "next/navigation";

import { GameBoardClient } from "@/components/game/GameBoardClient";
import { auth0 } from "@/lib/auth0";

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
