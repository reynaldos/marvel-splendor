"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "cn";

import { CardView } from "@/components/game/Card";
import { lessMotion } from "@/components/game/glide";
import { byStrength, wrapScroll } from "@/components/game/TeamView";
import { ZoomedView } from "@/components/game/Zoomable";
import { CARD_BY_ID } from "@/lib/engine/data";
import type { Card } from "@/lib/engine/types";

const COPIES = 3;
/** How fast the row drifts, in points a second. */
const DRIFT = 28;
/** How long the row waits after it was last touched before drifting on. */
const REST_MS = 1500;

/**
 * The team a player recruited, strongest first, in a row that drifts sideways
 * for ever and can be swiped either way. The browser does the scrolling; the
 * drift only moves it along, and waits while it is touched. Tapping a card
 * shows it large.
 */
export function TeamMarquee({ cardIds }: { cardIds: string[] }) {
  const [viewing, setViewing] = useState<{ card: Card; from: DOMRect } | null>(null);
  // Going round only when the cards don't all fit.
  const [looping, setLooping] = useState(false);
  const row = useRef<HTMLDivElement>(null);
  // When the row may drift again; for ever, while a finger or pointer is on it.
  const restUntil = useRef(0);
  // A card since taken out of the game is left out.
  const cards = cardIds.flatMap((id) => CARD_BY_ID.get(id) ?? []).sort(byStrength);

  // Measured once the cards are laid out, before anything is painted.
  useLayoutEffect(() => {
    const el = row.current;
    if (!el) return;
    if (looping) el.scrollLeft = el.scrollWidth / COPIES;
    else if (el.scrollWidth > el.clientWidth) setLooping(true);
  }, [looping]);

  useEffect(() => {
    const el = row.current;
    if (!el || !looping || viewing || lessMotion()) return;
    let frame = 0;
    let last = performance.now();
    // Scrolling moves by whole points, so what is left over is carried to the next frame.
    let owed = 0;
    const step = (now: number) => {
      if (now >= restUntil.current) owed += (DRIFT * Math.min(now - last, 100)) / 1000;
      last = now;
      if (owed >= 1) {
        el.scrollLeft += Math.floor(owed);
        owed %= 1;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [looping, viewing]);

  if (cards.length === 0) return <p className="text-center text-sm text-muted-foreground">No cards recruited.</p>;

  const hold = () => (restUntil.current = Infinity);
  const release = () => (restUntil.current = performance.now() + REST_MS);

  return (
    <section aria-label={`Team, ${cards.length} cards`} className="min-w-0">
      <div
        ref={row}
        data-drifting={looping}
        onScroll={(e) => {
          if (!looping) return;
          const el = e.currentTarget;
          const next = wrapScroll(el.scrollLeft, el.scrollWidth / COPIES);
          if (next !== el.scrollLeft) el.scrollLeft = next;
        }}
        onPointerDown={hold}
        onPointerEnter={hold}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        onWheel={release}
        className={cn(
          "flex touch-pan-x overflow-x-auto overscroll-x-contain py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          looping ? "fade-x" : "justify-center",
        )}
      >
        {Array.from({ length: looping ? COPIES : 1 }, (_, copy) =>
          cards.map((card) => {
            const real = copy === (looping ? 1 : 0);
            return (
              // A margin, not a gap, so every copy is exactly the same width.
              <button
                key={`${copy}-${card.id}`}
                type="button"
                aria-hidden={!real}
                tabIndex={real ? undefined : -1}
                aria-label={`${card.name}. Show it large`}
                onClick={(e) => setViewing({ card, from: e.currentTarget.getBoundingClientRect() })}
                className="mx-1 block shrink-0"
              >
                <CardView card={card} className="w-14" />
              </button>
            );
          }),
        )}
      </div>
      {viewing
        ? // Out on the page itself: inside the popup it would be cut off at the popup's edge.
          // The popup switches off touches everywhere else, so they are switched back on here.
          createPortal(
            <div className="theme-cosmos dark pointer-events-auto">
              <ZoomedView from={viewing.from} closeLabel={`Close ${viewing.card.name}`} onClose={() => setViewing(null)}>
                {/* Sized by the screen: out here nothing scales with it. */}
                <CardView card={viewing.card} className="w-[min(15.25rem,60dvh)] rounded-[10%/7.1%]" />
              </ZoomedView>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
