import { BoardSkeleton } from "@/components/game/BoardSkeleton";
import { pageMetadata } from "@/lib/site";

import { PreviewMenu } from "../PreviewBar";

export const metadata = pageMetadata("Loading preview", undefined, true);

/** The board's loading screen, held still to look at. */
export default function LoadingPreviewPage() {
  return (
    <>
      <BoardSkeleton />
      <PreviewMenu />
    </>
  );
}
