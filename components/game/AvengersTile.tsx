import { cn } from "cn";

import { ASSETS, AssetImage, AvengersIcon } from "@/components/game/assets";
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
 * Location tile: points top-left, the Avengers badge on the right (or the
 * supplied tile art), and along the bottom the current holder, or on the
 * drawn tile the threshold to claim it. Each
 * player's own tag count lives on their plaque. The tile moves once a
 * player's tags strictly exceed the holder's.
 */
export function AvengersTile({ avengersHolder, players, nameForSeat, className }: AvengersTileProps) {
  const holderTags = players.find((p) => p.seat === avengersHolder)?.tags ?? 0;

  return (
    <div
      title="Avengers Assemble"
      data-tile="avengers"
      className={cn(
        "@container relative aspect-square w-full overflow-hidden rounded-tile bg-muted ring-1 ring-foreground/10",
        className,
      )}
    >
      {ASSETS.avengersTile ? (
        <AssetImage src={ASSETS.avengersTile} alt="Avengers Assemble" />
      ) : (
        <>
          <span
            className="absolute top-[4cqw] left-[7cqw] text-[length:28cqw] leading-none font-black"
            title="Points"
          >
            {AVENGERS_TILE_POINTS}
          </span>
          <AvengersIcon className="absolute top-[5cqw] right-[5cqw] size-[40cqw] text-[length:30cqw]" />
        </>
      )}
      {/* The holder changes during play, so it's drawn over art too. The
          unclaimed hint is only for the drawn tile; art carries its own text. */}
      {avengersHolder !== null || !ASSETS.avengersTile ? (
        <span data-caption className="absolute inset-x-0 bottom-0 line-clamp-2 bg-black/60 px-[5cqw] py-[3cqw] text-[length:10.5cqw] leading-tight font-bold text-white uppercase">
          {avengersHolder !== null
            ? `${nameForSeat(avengersHolder)} (${holderTags})`
            : `First to ${TAGS_TO_CLAIM_AVENGERS} tags`}
        </span>
      ) : null}
    </div>
  );
}
