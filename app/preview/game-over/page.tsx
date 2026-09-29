import { pageMetadata } from "@/lib/site";

import { GameOverPreview } from "./GameOverPreview";
import { RESULTS, type Result } from "./standings";

export const metadata = pageMetadata("End of game preview", undefined, true);

// A page for looking at the end of a game without playing one. Its table is made up; nothing is read or saved.
export default async function GameOverPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string; players?: string }>;
}) {
  const { result, players } = await searchParams;
  const count = Number(players);

  return (
    <GameOverPreview
      // Remade for each choice, so the screen plays from the start.
      key={`${result}-${players}`}
      result={RESULTS.find((r) => r === result) ?? ("win" satisfies Result)}
      players={[2, 3, 4].includes(count) ? count : 3}
    />
  );
}
