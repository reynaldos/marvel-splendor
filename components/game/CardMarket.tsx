"use client";

import { cn } from "cn";

import { Card } from "@/components/game/Card";
import { estimateAffordability } from "@/components/game/affordability";
import { getCard } from "@/lib/engine/data";
import { MAX_RESERVED, type CardLevel, type StoneCounts, type TokenCounts } from "@/lib/engine/types";
import type { StagedAction } from "@/components/game/staged-action";

const LEVEL_LABEL = { 1: "I", 2: "II", 3: "III" } as const;

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
      <DeckIndicator
        label={LEVEL_LABEL[level]}
        count={deckCount}
        selected={staged?.kind === "reserve" && staged.from === "deck" && staged.level === level}
        disabled={disabled || !canReserve}
        onClick={() => onStageReserveDeck(level)}
      />
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
            className="h-22 w-16 shrink-0 rounded-md border border-dashed border-foreground/15"
          />
        ),
      )}
    </div>
  );
}

function DeckIndicator({
  label,
  count,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  count: number;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled || count === 0}
      onClick={onClick}
      title="Reserve blind from this deck"
      aria-pressed={selected}
      className={cn(
        "flex h-22 w-16 shrink-0 flex-col items-center justify-center rounded-md bg-muted text-center ring-1 ring-foreground/10 transition-opacity hover:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-40",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
    >
      <span className="font-serif text-2xl font-black">{label}</span>
      <span className="fs-2xs text-muted-foreground">{count} left</span>
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
