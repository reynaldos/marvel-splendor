import { pageMetadata } from "@/lib/site";

import { BoardPreview } from "./BoardPreview";

export const metadata = pageMetadata("Board animations preview", undefined, true);

// A page for looking at the board's animations without playing a game. Its table is made up; nothing is read or saved.
export default async function BoardPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; at?: string; players?: string }>;
}) {
  const { show, at, players } = await searchParams;
  const count = Number(players);
  return (
    <BoardPreview
      // Remade for each table size, so nothing is left over from the last.
      key={players}
      show={show}
      at={at === undefined ? undefined : Number(at)}
      count={[2, 3, 4].includes(count) ? count : 3}
    />
  );
}
