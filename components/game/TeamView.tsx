"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { duelArt } from "@/components/duel/duel-art";
import { DuelCardView } from "@/components/duel/DuelCard";
import { CardView } from "@/components/game/Card";
import { Zoomable } from "@/components/game/Zoomable";
import { getDuelCard } from "@/lib/duel/data";
import { getCard } from "@/lib/engine/data";
import type { Card } from "@/lib/engine/types";

interface TeamViewProps {
  /** Whose team, as it reads in the heading: "Your" or "Bot's". */
  owner: string;
  /** Recruited card ids, in any order. */
  cardIds: string[];
  /** The ids are Duel cards: shown with their Duel faces, strongest by Duel's points and badges first. */
  duel?: boolean;
  className?: string;
  /** What to tap to open it. */
  children: ReactNode;
}

const totalCost = (card: Card) => Object.values(card.cost).reduce((sum, n) => sum + n, 0);

/** Strongest first: by points, then Avengers tags, then level, then total cost. */
export function byStrength(a: Card, b: Card): number {
  return b.points - a.points || b.tags - a.tags || b.level - a.level || totalCost(b) - totalCost(a);
}

/** Copies of the row laid end to end; the view rests in the middle one. */
export const COPIES = 5;
const MIDDLE = Math.floor(COPIES / 2);

/**
 * Where to move a looping row's scroll position so it never reaches an end.
 * At rest it goes back to the same place in the middle copy, which can't be
 * seen because the copies are identical. Mid-swipe it is left alone, as a
 * move stops the swipe dead on iOS, unless an end is within a screen's width.
 */
export function wrapScroll(scrollLeft: number, copyWidth: number, viewWidth: number, atRest: boolean): number {
  const middle = (scrollLeft % copyWidth) + copyWidth * MIDDLE;
  const nearEnd = scrollLeft < viewWidth || scrollLeft > copyWidth * COPIES - viewWidth * 2;
  return atRest || nearEnd ? middle : scrollLeft;
}

/** How long the row must stay still before it counts as at rest. */
const REST_MS = 150;

/**
 * The cards in a row that is swiped sideways. When they don't all fit, the
 * row goes round forever: past the weakest card comes the strongest again.
 * The browser does the scrolling, so touch and momentum feel native.
 */
function TeamRow({ cards }: { cards: Array<{ id: string; face: ReactNode }> }) {
  const row = useRef<HTMLDivElement>(null);
  const rest = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [looping, setLooping] = useState(false);

  // Measured once the cards are laid out, before anything is painted.
  useLayoutEffect(() => {
    const el = row.current;
    if (!el) return;
    if (looping) el.scrollLeft = (el.scrollWidth / COPIES) * MIDDLE;
    else if (el.scrollWidth > el.clientWidth) setLooping(true);
  }, [looping]);

  useEffect(() => () => clearTimeout(rest.current), []);

  const wrap = (el: HTMLDivElement, atRest: boolean) => {
    const next = wrapScroll(el.scrollLeft, el.scrollWidth / COPIES, el.clientWidth, atRest);
    if (Math.abs(next - el.scrollLeft) > 1) el.scrollLeft = next;
  };

  return (
    <div
      ref={row}
      onScroll={(e) => {
        if (!looping) return;
        const el = e.currentTarget;
        wrap(el, false);
        clearTimeout(rest.current);
        rest.current = setTimeout(() => wrap(el, true), REST_MS);
      }}
      className="flex max-w-dvw touch-pan-x overflow-x-auto overscroll-x-contain py-2 [scrollbar-width:none]"
    >
      {Array.from({ length: looping ? COPIES : 1 }, (_, copy) =>
        cards.map((card) => (
          // A margin, not a gap, so every copy is exactly the same width.
          <span key={`${copy}-${card.id}`} aria-hidden={copy !== (looping ? MIDDLE : 0)} className="mx-2 shrink-0">
            {card.face}
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
export function TeamView({ owner, cardIds, duel, className, children }: TeamViewProps) {
  const face = "w-38 rounded-[10%/7.1%]";
  const cards = duel
    ? cardIds
        .map((id) => ({ id, card: getDuelCard(id) }))
        .sort((a, b) => b.card.points - a.card.points || b.card.crowns - a.card.crowns || b.card.level - a.card.level || byStrength(duelArt(a.id), duelArt(b.id)))
        .map(({ id }) => ({ id, face: <DuelCardView cardId={id} className={face} /> }))
    : cardIds
        .map(getCard)
        .sort(byStrength)
        .map((card) => ({ id: card.id, face: <CardView card={card} className={face} /> }));

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
