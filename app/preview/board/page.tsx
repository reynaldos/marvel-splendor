import { BgmPlayer } from "@/components/audio";
import { pageMetadata } from "@/lib/site";

import { BoardPreview } from "./BoardPreview";

export const metadata = pageMetadata("Board animations preview", undefined, true);

// A page for looking at the board's animations without playing a game. Its table is made up; nothing is read or saved.
export default async function BoardPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; at?: string; players?: string; first?: string }>;
}) {
  const { show, at, players, first } = await searchParams;
  const count = Number(players);
  const seats = [2, 3, 4].includes(count) ? count : 3;
  const starter = Number(first);
  return (
    <>
      <BgmPlayer />
      <BoardPreview
        // Remade for each table size and starter, so nothing is left over from the last.
        key={`${players}-${first}`}
        show={show}
        at={at === undefined ? undefined : Number(at)}
        count={seats}
        first={Number.isInteger(starter) && starter >= 0 && starter < seats ? starter : 1}
      />
    </>
  );
}
