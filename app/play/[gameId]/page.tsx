import { redirect } from "next/navigation";

import { BgmPlayer } from "@/components/audio";
import { DuelBoardClient } from "@/components/duel/DuelBoardClient";
import { GameBoardClient } from "@/components/game/GameBoardClient";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import type { GameSettings } from "@/lib/engine/types";
import { rulesOf } from "@/lib/game-rules";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("Game", undefined, true);

// The game board (ARCHITECTURE.md §6: `play/[gameId]/page.tsx`, "both
// modes"). Only the game's rules are read here, to pick which board; the
// board client fetches the game itself, as it must re-fetch after every move.
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

  const game = await prisma.game.findUnique({ where: { id: gameId }, select: { settings: true } });
  const rules = rulesOf(game?.settings as Partial<GameSettings> | null);

  // The music plays at the table only; leaving the board stops it.
  return (
    <>
      <BgmPlayer />
      {rules === "duel" ? <DuelBoardClient gameId={gameId} /> : <GameBoardClient gameId={gameId} />}
    </>
  );
}
