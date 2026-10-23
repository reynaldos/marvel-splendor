"use client";

import { cn } from "cn";

import { ASSETS, AssetImage } from "@/components/game/assets";
import { Card, CardView } from "@/components/game/Card";
import { useTracedMove } from "@/components/game/traced-move";
import { Zoomable } from "@/components/game/Zoomable";
import { getCard } from "@/lib/engine/data";
import { MAX_RESERVED } from "@/lib/engine/types";
import type { RedactedReservedCard } from "@/lib/game-view";

interface ReserveTrayProps {
  reserved: RedactedReservedCard[];
  /** Whose cards these are, to outline the one they recruit. */
  seat: number;
  /** Whose cards these are, for the enlarged view's heading. */
  ownerName: string;
  className?: string;
  /** Width (`w-*`) of each card slot; the height follows. */
  cardClassName?: string;
}

function ReservedCard({ entry, className }: { entry: RedactedReservedCard; className: string }) {
  if ("cardId" in entry) return <CardView card={getCard(entry.cardId)} className={className} />;

  // A blind reserve shows the back of the deck it came from.
  const back = ASSETS.deckBacks[entry.level];
  return back ? (
    <span className={cn("relative block aspect-card shrink-0 overflow-hidden ring-1 ring-foreground/10", className)}>
      <AssetImage src={back} alt={`Face-down level ${entry.level} card`} />
    </span>
  ) : (
    <Card faceDown className={className} />
  );
}

/**
 * An opponent's up-to-3 reserved cards, display-only (rulebook: max 3,
 * never discardable). A blind reservation renders as an unidentifiable
 * face-down card — the slot is never omitted. Tapping any of them shows
 * them all large, side by side. The viewer's own reserved cards live in
 * `ReservedCards`.
 */
export function ReserveTray({ reserved, seat, ownerName, className, cardClassName = "w-12" }: ReserveTrayProps) {
  const slots = Array.from({ length: MAX_RESERVED }, (_, i) => reserved[i]);
  const played = useTracedMove();
  const recruited =
    played?.seat === seat && played.move.type === "RECRUIT" && played.move.from === "reserve"
      ? getCard(played.move.cardId)
      : null;
  // A card reserved blind is known only by its level, so the first of that level stands for it.
  const traced = recruited
    ? reserved.findIndex((r) => ("cardId" in r ? r.cardId === recruited.id : r.level === recruited.level))
    : -1;
  const tray = slots.map((entry, i) =>
    entry ? (
      <span key={i} className={cn("relative flex rounded-sm", i === traced && "trace trace-card [--lift:2.5]")}>
        <ReservedCard entry={entry} className={cardClassName} />
      </span>
    ) : (
      <div key={i} className={cn("aspect-card shrink-0 rounded-md border border-dashed border-foreground/15", cardClassName)} />
    ),
  );
  const layout = cn("flex shrink-0 gap-1.5", className);

  if (reserved.length === 0) return <div className={layout}>{tray}</div>;

  return (
    <Zoomable
      label={`Show ${ownerName}'s reserved cards`}
      title={`${ownerName}'s reserved cards`}
      className={layout}
      zoomed={
        <div className="flex gap-6">
          {reserved.map((entry, i) => (
            <ReservedCard key={i} entry={entry} className="w-38 rounded-[10%/7.1%]" />
          ))}
        </div>
      }
    >
      {tray}
    </Zoomable>
  );
}
