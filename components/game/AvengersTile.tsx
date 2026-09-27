import { cn } from "cn";

import { AVENGERS_TILE_POINTS, TAGS_TO_CLAIM_AVENGERS } from "@/lib/engine/types";
import type { RedactedPlayerState } from "@/lib/game-view";

interface AvengersTileProps {
  avengersHolder: number | null;
  players: RedactedPlayerState[];
  nameForSeat: (seat: number) => string;
  className?: string;
}

/**
 * The contested Avengers Assemble tile (ARCHITECTURE.md §1), square like a
 * Location tile: points top-left, the Avengers badge on the right, and
 * along the bottom the current holder (or the threshold to claim it). Each
 * player's own tag count lives on their plaque. The tile moves once a
 * player's tags strictly exceed the holder's.
 */
export function AvengersTile({ avengersHolder, players, nameForSeat, className }: AvengersTileProps) {
  const holderTags = players.find((p) => p.seat === avengersHolder)?.tags ?? 0;

  return (
    <div
      title="Avengers Assemble"
      className={cn(
        "@container relative aspect-square w-full overflow-hidden rounded-md bg-muted ring-1 ring-foreground/10",
        className,
      )}
    >
      <span className="absolute top-[4cqw] left-[7cqw] text-[length:28cqw] leading-none font-black" title="Points">
        {AVENGERS_TILE_POINTS}
      </span>
      <span className="absolute top-[5cqw] right-[5cqw] flex size-[40cqw] items-center justify-center rounded-full bg-white text-[length:30cqw] font-black text-red-600 ring-1 ring-black/30">
        A
      </span>
      <span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-black/60 px-[5cqw] py-[3cqw] text-[length:10.5cqw] leading-tight font-bold text-white uppercase">
        {avengersHolder !== null
          ? `${nameForSeat(avengersHolder)} (${holderTags})`
          : `First to ${TAGS_TO_CLAIM_AVENGERS} tags`}
      </span>
    </div>
  );
}
