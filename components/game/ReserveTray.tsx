"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "cn";

import { Card } from "@/components/game/Card";
import { estimateAffordability } from "@/components/game/affordability";
import { getCard } from "@/lib/engine/data";
import { MAX_RESERVED, type StoneCounts, type TokenCounts } from "@/lib/engine/types";
import type { RedactedReservedCard } from "@/lib/game-view";
import type { StagedAction } from "@/components/game/staged-action";

interface ReserveTrayProps {
  reserved: RedactedReservedCard[];
  /** The viewer's own reservations show real cards even when blind; an
   * opponent's blind reservation must render as an unidentifiable face-down
   * card — never omit the slot. */
  isViewer: boolean;
  viewerTokens?: TokenCounts;
  viewerBonuses?: StoneCounts;
  staged?: StagedAction | null;
  disabled?: boolean;
  /** Only the viewer's own tray is a dnd-kit drop target for reserving. */
  isDropTarget?: boolean;
  onStageRecruit?: (cardId: string) => void;
  className?: string;
  size?: "sm" | "default";
}

/** A player's up-to-3 reserved cards (ARCHITECTURE.md §6 / rulebook: max 3, never discardable). */
export function ReserveTray({
  reserved,
  isViewer,
  viewerTokens,
  viewerBonuses,
  staged,
  disabled,
  isDropTarget,
  onStageRecruit,
  className,
  size = "sm",
}: ReserveTrayProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: "reserve-tray",
    disabled: !isDropTarget || disabled,
  });

  const slots = Array.from({ length: MAX_RESERVED }, (_, i) => reserved[i]);

  return (
    <div
      ref={isDropTarget ? setNodeRef : undefined}
      className={cn(
        "flex gap-1.5 rounded-md p-1",
        isDropTarget && "ring-1 ring-dashed ring-foreground/15",
        isDropTarget && isOver && "bg-primary/10 ring-primary",
        className,
      )}
    >
      {slots.map((entry, i) =>
        entry ? (
          <ReservedCardSlot
            key={i}
            entry={entry}
            isViewer={isViewer}
            viewerTokens={viewerTokens}
            viewerBonuses={viewerBonuses}
            staged={staged}
            disabled={disabled}
            onStageRecruit={onStageRecruit}
            size={size}
          />
        ) : (
          <div
            key={i}
            className={cn(
              "flex shrink-0 items-center justify-center rounded-md border border-dashed border-foreground/15 text-[0.55rem] text-muted-foreground",
              size === "sm" ? "h-24 w-16" : "h-36 w-24",
            )}
          >
            Empty
          </div>
        ),
      )}
    </div>
  );
}

function ReservedCardSlot({
  entry,
  isViewer,
  viewerTokens,
  viewerBonuses,
  staged,
  disabled,
  onStageRecruit,
  size,
}: {
  entry: RedactedReservedCard;
  isViewer: boolean;
  viewerTokens?: TokenCounts;
  viewerBonuses?: StoneCounts;
  staged?: StagedAction | null;
  disabled?: boolean;
  onStageRecruit?: (cardId: string) => void;
  size: "sm" | "default";
}) {
  if (!("cardId" in entry)) {
    // Someone else's blind reservation — identity genuinely unknown.
    return <Card faceDown size={size} />;
  }

  const card = getCard(entry.cardId);
  const canRecruit = isViewer && Boolean(onStageRecruit) && viewerTokens && viewerBonuses;
  const affordable = canRecruit
    ? estimateAffordability(card, viewerTokens!, viewerBonuses!).affordable
    : false;
  const selected = staged?.kind === "recruit" && staged.cardId === entry.cardId;

  return (
    <Card
      card={card}
      size={size}
      affordable={canRecruit ? affordable : undefined}
      selected={selected}
      disabled={disabled}
      recruitAction={
        canRecruit
          ? { label: "Recruit", onClick: () => onStageRecruit!(entry.cardId), disabled: !affordable }
          : undefined
      }
    />
  );
}
