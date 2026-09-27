"use client";

import { useState } from "react";
import { cn } from "cn";

import { CardView } from "@/components/game/Card";
import { estimateAffordability } from "@/components/game/affordability";
import { getCard } from "@/lib/engine/data";
import type { StoneCounts, TokenCounts } from "@/lib/engine/types";
import type { RedactedReservedCard } from "@/lib/game-view";

interface ReservedCardsProps {
  reserved: RedactedReservedCard[];
  viewerTokens: TokenCounts;
  viewerBonuses: StoneCounts;
  /** True when one of these cards is the currently staged recruit. */
  selected?: boolean;
  /** Not the viewer's turn (or busy): cards can be inspected but not recruited. */
  disabled?: boolean;
  onStageRecruit: (cardId: string) => void;
}

/**
 * The viewer's reserved cards: a fan peeking out of the tray. Tapping it
 * dims the board and lays the cards out large, bordered green when
 * affordable and red when not; tapping an affordable one recruits it.
 */
export function ReservedCards({
  reserved,
  viewerTokens,
  viewerBonuses,
  selected,
  disabled,
  onStageRecruit,
}: ReservedCardsProps) {
  const [open, setOpen] = useState(false);
  // The viewer always sees their own cards, blind-reserved or not.
  const cards = reserved.flatMap((r) => ("cardId" in r ? [getCard(r.cardId)] : []));

  if (cards.length === 0) return null;

  return (
    <>
      <button
        type="button"
        aria-label={`Your reserved cards (${cards.length})`}
        onClick={() => setOpen(true)}
        className="relative mr-1 w-22 shrink-0 self-stretch [clip-path:inset(-50%_-50%_0_-50%)]"
      >
        {cards.map((card, i) => (
          <CardView
            key={card.id}
            card={card}
            className={cn(
              "absolute top-2 h-20 w-14 origin-bottom shadow-md",
              selected && "ring-2 ring-primary",
            )}
            // Fan out around the middle card.
            style={{
              left: `calc(var(--spacing) * ${i * 3.5})`,
              rotate: `${(i - (cards.length - 1) / 2) * 8}deg`,
            }}
          />
        ))}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <button
            type="button"
            aria-label="Close reserved cards"
            className="absolute inset-0 cursor-default bg-black/75"
            onClick={() => setOpen(false)}
          />
          <h2 className="relative text-2xl font-black tracking-wide text-white uppercase">
            {disabled ? "Your reserved cards" : "Select a card to recruit"}
          </h2>
          <div className="relative flex gap-6">
            {cards.map((card) => {
              const affordable = estimateAffordability(card, viewerTokens, viewerBonuses).affordable;
              return (
                <button
                  key={card.id}
                  type="button"
                  disabled={disabled || !affordable}
                  aria-label={`${card.name}, ${affordable ? "affordable" : "not affordable"}`}
                  onClick={() => {
                    onStageRecruit(card.id);
                    setOpen(false);
                  }}
                >
                  <CardView
                    card={card}
                    className={cn("h-52 w-38 rounded-xl ring-4", affordable ? "ring-green-500" : "ring-red-500")}
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
}
