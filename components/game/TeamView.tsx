"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { CardView } from "@/components/game/Card";
import { Zoomable } from "@/components/game/Zoomable";
import { getCard } from "@/lib/engine/data";
import type { Card } from "@/lib/engine/types";

interface TeamViewProps {
  /** Whose team, as it reads in the heading: "Your" or "Bot's". */
  owner: string;
  /** Recruited card ids, in any order. */
  cardIds: string[];
  className?: string;
  /** What to tap to open it. */
  children: ReactNode;
}

const totalCost = (card: Card) => Object.values(card.cost).reduce((sum, n) => sum + n, 0);

/** Strongest first: by points, then Avengers tags, then level, then total cost. */
export function byStrength(a: Card, b: Card): number {
  return b.points - a.points || b.tags - a.tags || b.level - a.level || totalCost(b) - totalCost(a);
}

/**
 * Where to move a looping row's scroll position so it never reaches an end:
 * once the view drifts out of the middle copy it steps back by one copy's
 * width, which can't be seen because the copies are identical.
 */
export function wrapScroll(scrollLeft: number, copyWidth: number): number {
  if (scrollLeft < copyWidth * 0.5) return scrollLeft + copyWidth;
  if (scrollLeft >= copyWidth * 1.5) return scrollLeft - copyWidth;
  return scrollLeft;
}

const COPIES = 3;

/**
 * The cards in a row that is swiped sideways. When they don't all fit, the
 * row goes round forever: past the weakest card comes the strongest again.
 * The browser does the scrolling, so touch and momentum feel native.
 */
function TeamRow({ cards }: { cards: Card[] }) {
  const row = useRef<HTMLDivElement>(null);
  const [looping, setLooping] = useState(false);

  // Measured once the cards are laid out, before anything is painted.
  useLayoutEffect(() => {
    const el = row.current;
    if (!el) return;
    if (looping) el.scrollLeft = el.scrollWidth / COPIES;
    else if (el.scrollWidth > el.clientWidth) setLooping(true);
  }, [looping]);

  return (
    <div
      ref={row}
      onScroll={(e) => {
        if (!looping) return;
        const el = e.currentTarget;
        const next = wrapScroll(el.scrollLeft, el.scrollWidth / COPIES);
        if (next !== el.scrollLeft) el.scrollLeft = next;
      }}
      className="flex max-w-dvw touch-pan-x overflow-x-auto overscroll-x-contain py-2 [scrollbar-width:none]"
    >
      {Array.from({ length: looping ? COPIES : 1 }, (_, copy) =>
        cards.map((card) => (
          // A margin, not a gap, so every copy is exactly the same width.
          <span key={`${copy}-${card.id}`} aria-hidden={copy !== (looping ? 1 : 0)} className="mx-2 shrink-0">
            <CardView card={card} className="w-38 rounded-xl" />
          </span>
        )),
      )}
    </div>
  );
}

/**
 * Tapping `children` shows every card a player has recruited, large and
 * strongest first, in a row that is swiped sideways.
 */
export function TeamView({ owner, cardIds, className, children }: TeamViewProps) {
  const cards = cardIds.map(getCard).sort(byStrength);

  return (
    <Zoomable
      label={`Show ${owner.toLowerCase()} team`}
      title={`${owner} team (${cards.length})`}
      interactive
      className={className}
      zoomed={
        cards.length === 0 ? (
          <p className="text-base text-white/70">No cards recruited yet.</p>
        ) : (
          <TeamRow cards={cards} />
        )
      }
    >
      {children}
    </Zoomable>
  );
}
