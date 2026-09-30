import { pageMetadata } from "@/lib/site";

import { GameOverPreview } from "./GameOverPreview";
import { CARD_LEVEL_UPS, RESULTS, type Result } from "./standings";

export const metadata = pageMetadata("End of game preview", undefined, true);

// A page for looking at the end of a game without playing one. Its table is made up; nothing is read or saved.
export default async function GameOverPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string; players?: string; cards?: string }>;
}) {
  const { result, players, cards } = await searchParams;
  const count = Number(players);
  const levelUps = Number(cards);

  return (
    <GameOverPreview
      // Remade for each choice, so the screen plays from the start.
      key={`${result}-${players}-${cards}`}
      result={RESULTS.find((r) => r === result) ?? ("win" satisfies Result)}
      players={[2, 3, 4].includes(count) ? count : 3}
      cards={Number.isInteger(levelUps) ? Math.min(Math.max(levelUps, 0), CARD_LEVEL_UPS.length) : 1}
    />
  );
}
