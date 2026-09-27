import { cn } from "cn";

import { Card } from "@/components/game/Card";
import { getCard } from "@/lib/engine/data";
import { MAX_RESERVED } from "@/lib/engine/types";
import type { RedactedReservedCard } from "@/lib/game-view";

interface ReserveTrayProps {
  reserved: RedactedReservedCard[];
  className?: string;
  /** `h-* w-*` for each card slot. */
  cardClassName?: string;
}

/**
 * An opponent's up-to-3 reserved cards, display-only (rulebook: max 3,
 * never discardable). A blind reservation renders as an unidentifiable
 * face-down card — the slot is never omitted. The viewer's own reserved
 * cards live in `ReservedCards`.
 */
export function ReserveTray({ reserved, className, cardClassName = "h-17 w-12" }: ReserveTrayProps) {
  const slots = Array.from({ length: MAX_RESERVED }, (_, i) => reserved[i]);

  return (
    <div className={cn("flex shrink-0 gap-1.5", className)}>
      {slots.map((entry, i) =>
        !entry ? (
          <div
            key={i}
            className={cn("shrink-0 rounded-md border border-dashed border-foreground/15", cardClassName)}
          />
        ) : "cardId" in entry ? (
          <Card key={i} card={getCard(entry.cardId)} className={cardClassName} />
        ) : (
          <Card key={i} faceDown className={cardClassName} />
        ),
      )}
    </div>
  );
}
