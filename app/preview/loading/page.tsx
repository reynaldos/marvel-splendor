import { BoardSkeleton, DuelBoardSkeleton } from "@/components/game/BoardSkeleton";
import { pageMetadata } from "@/lib/site";

import { PreviewMenu } from "../PreviewBar";

export const metadata = pageMetadata("Loading preview", undefined, true);

/** The board's loading screen, held still to look at; `?game=duel` shows the Duel board's. */
export default async function LoadingPreviewPage({ searchParams }: { searchParams: Promise<{ game?: string }> }) {
  const duel = (await searchParams).game === "duel";
  return (
    <>
      {duel ? <DuelBoardSkeleton /> : <BoardSkeleton />}
      <PreviewMenu />
    </>
  );
}
