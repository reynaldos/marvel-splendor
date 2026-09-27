import { cn } from "cn";
import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon } from "@hugeicons/core-free-icons";

import { AVENGERS_TILE_POINTS, TAGS_TO_CLAIM_AVENGERS } from "@/lib/engine/types";
import type { RedactedPlayerState } from "@/lib/game-view";

interface AvengersTileProps {
  avengersHolder: number | null;
  players: RedactedPlayerState[];
  nameForSeat: (seat: number) => string;
  className?: string;
}

/**
 * The contested Avengers Assemble tile (ARCHITECTURE.md §1). Shows the
 * current holder (or "Unclaimed"), the flat point value, and every
 * player's Avengers-tag count so the viewer can see how close a steal is —
 * the tile moves once a player's tags strictly exceed the holder's (or hit
 * the unclaimed threshold).
 */
export function AvengersTile({ avengersHolder, players, nameForSeat, className }: AvengersTileProps) {
  const holderTags = avengersHolder !== null ? players.find((p) => p.seat === avengersHolder)?.tags ?? 0 : null;

  return (
    <div className={cn("flex flex-col gap-1.5 rounded-md bg-card p-2 ring-1 ring-foreground/10", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-xs font-medium">
          <HugeiconsIcon icon={Shield01Icon} strokeWidth={2} className="size-3.5" />
          Avengers Assemble
        </span>
        <span className="text-xs font-bold">{AVENGERS_TILE_POINTS} pts</span>
      </div>
      <p className="text-[0.65rem] text-muted-foreground">
        {avengersHolder !== null
          ? `Held by ${nameForSeat(avengersHolder)} (${holderTags} tags)`
          : `Unclaimed — first to ${TAGS_TO_CLAIM_AVENGERS} tags takes it`}
      </p>
      <div className="flex flex-wrap gap-1">
        {[...players]
          .sort((a, b) => a.seat - b.seat)
          .map((p) => (
            <span
              key={p.seat}
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[0.6rem]",
                p.seat === avengersHolder ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {nameForSeat(p.seat)}: {p.tags}
            </span>
          ))}
      </div>
    </div>
  );
}
