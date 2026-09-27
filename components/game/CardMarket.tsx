"use client";

import { useSearchParams } from "next/navigation";
import { cn } from "cn";

import { ASSETS, AssetImage } from "@/components/game/assets";
import { Card } from "@/components/game/Card";
import { PileLayers } from "@/components/game/PileLayers";
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
        level={level}
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
            className="aspect-card w-16 shrink-0 rounded-md border border-dashed border-foreground/15"
          />
        ),
      )}
    </div>
  );
}

function DeckIndicator({
  level,
  count,
  selected,
  disabled,
  onClick,
}: {
  level: CardLevel;
  /** Cards left in the deck. */
  count: number;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const back = ASSETS.deckBacks[level];
  const face = back ? (
    <AssetImage src={back} alt={`Level ${LEVEL_LABEL[level]} deck`} />
  ) : (
    <span className="font-serif text-2xl font-black">{LEVEL_LABEL[level]}</span>
  );
  const CARD = "flex size-full items-center justify-center overflow-hidden rounded-md bg-muted ring-1 ring-foreground/10";

  return (
    // Only an empty deck fades; one you can't draw from right now looks the same.
    // The margin is room for the pile's spread, clear of the first market card.
    <div className={cn("relative mr-2 aspect-card w-16 shrink-0", count === 0 && "opacity-40")}>
      <PileLayers count={count} max={2} dx={0.4} dy={0.4} tilt={1.5} className="size-full">
        <span className={cn("relative", CARD)}>{face}</span>
      </PileLayers>
      <button
        type="button"
        disabled={disabled || count === 0}
        onClick={onClick}
        title="Reserve blind from this deck"
        aria-pressed={selected}
        className={cn(
          "relative text-center disabled:cursor-default",
          CARD,
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        )}
      >
        {face}
      </button>
    </div>
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
  // The affordable outline is a hint, shown only with ?cheat=true.
  const cheat = useSearchParams().get("cheat") === "true";
  const selected =
    (staged?.kind === "reserve" && staged.from === "market" && staged.cardId === cardId) ||
    (staged?.kind === "recruit" && staged.cardId === cardId);

  return (
    <Card
      card={card}
      affordable={cheat && affordable}
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
