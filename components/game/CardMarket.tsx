"use client";

import { useDraggable } from "@dnd-kit/core";
import { cn } from "cn";

import { Card } from "@/components/game/Card";
import { Badge } from "@/components/ui/badge";
import { estimateAffordability } from "@/components/game/affordability";
import { getCard } from "@/lib/engine/data";
import { MAX_RESERVED, type CardLevel, type StoneCounts, type TokenCounts } from "@/lib/engine/types";
import type { StagedAction } from "@/components/game/staged-action";

const LEVEL_LABEL = { 1: "Level I", 2: "Level II", 3: "Level III" } as const;

interface CardMarketProps {
  level: CardLevel;
  slots: (string | null)[];
  deckCount: number;
  viewerTokens: TokenCounts;
  viewerBonuses: StoneCounts;
  viewerReservedCount: number;
  staged: StagedAction | null;
  disabled?: boolean;
  onStageReserveMarket: (level: CardLevel, cardId: string) => void;
  onStageReserveDeck: (level: CardLevel) => void;
  onStageRecruit: (cardId: string) => void;
}

/** One level's face-up row (ARCHITECTURE.md §6: three of these stacked III/II/I). */
export function CardMarket({
  level,
  slots,
  deckCount,
  viewerTokens,
  viewerBonuses,
  viewerReservedCount,
  staged,
  disabled,
  onStageReserveMarket,
  onStageReserveDeck,
  onStageRecruit,
}: CardMarketProps) {
  const canReserve = viewerReservedCount < MAX_RESERVED;

  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
        {LEVEL_LABEL[level]}
      </span>
      <DeckIndicator
        level={level}
        count={deckCount}
        disabled={disabled || !canReserve}
        onClick={() => onStageReserveDeck(level)}
      />
      <div className="flex flex-1 gap-2">
        {slots.map((cardId, slotIndex) =>
          cardId ? (
            <MarketCard
              key={`${level}-${slotIndex}-${cardId}`}
              level={level}
              cardId={cardId}
              viewerTokens={viewerTokens}
              viewerBonuses={viewerBonuses}
              canReserve={canReserve}
              staged={staged}
              disabled={disabled}
              onStageReserveMarket={onStageReserveMarket}
              onStageRecruit={onStageRecruit}
            />
          ) : (
            <div
              key={`${level}-empty-${slotIndex}`}
              className="flex h-36 w-24 shrink-0 items-center justify-center rounded-md border border-dashed border-foreground/15 text-[0.6rem] text-muted-foreground"
            >
              Empty
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function DeckIndicator({
  level,
  count,
  disabled,
  onClick,
}: {
  level: CardLevel;
  count: number;
  disabled?: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `deck:${level}`,
    data: { type: "deck", level },
    disabled: disabled || count === 0,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      disabled={disabled || count === 0}
      onClick={onClick}
      {...attributes}
      {...listeners}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
          : undefined
      }
      title="Reserve blind from this deck"
      className={cn(
        "relative flex h-36 w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-md bg-muted text-center ring-1 ring-foreground/10 transition-opacity disabled:cursor-not-allowed disabled:opacity-40",
        !disabled && count > 0 && "cursor-grab hover:bg-muted/70 active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
    >
      <div className="size-8 rounded-full bg-foreground/10" />
      <Badge variant="secondary">{count} left</Badge>
    </button>
  );
}

function MarketCard({
  level,
  cardId,
  viewerTokens,
  viewerBonuses,
  canReserve,
  staged,
  disabled,
  onStageReserveMarket,
  onStageRecruit,
}: {
  level: CardLevel;
  cardId: string;
  viewerTokens: TokenCounts;
  viewerBonuses: StoneCounts;
  canReserve: boolean;
  staged: StagedAction | null;
  disabled?: boolean;
  onStageReserveMarket: (level: CardLevel, cardId: string) => void;
  onStageRecruit: (cardId: string) => void;
}) {
  const card = getCard(cardId);
  const { affordable } = estimateAffordability(card, viewerTokens, viewerBonuses);
  const selected =
    (staged?.kind === "reserve" && staged.from === "market" && staged.cardId === cardId) ||
    (staged?.kind === "recruit" && staged.cardId === cardId);

  return (
    <Card
      card={card}
      affordable={affordable}
      selected={selected}
      disabled={disabled}
      dragId={`card:${level}:${cardId}`}
      dragData={{ type: "card", from: "market", cardId, level, affordable }}
      reserveAction={{
        label: "Reserve",
        onClick: () => onStageReserveMarket(level, cardId),
        disabled: !canReserve,
      }}
      recruitAction={{
        label: "Recruit",
        onClick: () => onStageRecruit(cardId),
        disabled: !affordable,
      }}
    />
  );
}
