"use client";

import { useState } from "react";
import { cn } from "cn";

import { BackLink } from "@/components/BackLink";
import { CardView } from "@/components/game/Card";
import { ZoomedView } from "@/components/game/Zoomable";
import { Stage } from "@/components/Stage";
import { COLLECTION_VIEWS, collectionRows, type CollectionView } from "@/lib/collection-views";
import { ALL_CARDS } from "@/lib/engine/data";
import type { Card } from "@/lib/engine/types";

const VIEW_NAMES: Record<CollectionView, string> = { grid: "Grid", level: "Level", group: "Group", alliance: "Alliance" };
const SLOT = "relative aspect-card w-full rounded-md";
// As many cards across as fit, each stretched a little so the row is filled from edge to edge.
const CARDS = "grid flex-1 grid-cols-[repeat(auto-fill,minmax(calc(var(--spacing)*14),1fr))] gap-2";

interface CollectionScreenProps {
  /** How many times the player has recruited each card they have found, by card id. */
  found: Record<string, number>;
  /** The profile it belongs to, for the way back. */
  backTo: string;
}

/**
 * Every card in the game: the ones the player has recruited are shown, and
 * the rest are empty spaces marked with a question mark. Seen as one grid,
 * or in rows by level, by group or by alliance.
 */
export function CollectionScreen({ found, backTo }: CollectionScreenProps) {
  const [view, setView] = useState<CollectionView>("grid");
  // Shown large from here, not from inside the list, whose faded edges would cut it off.
  const [viewing, setViewing] = useState<{ card: Card; from: DOMRect } | null>(null);
  const count = (cards: Card[]) => `${cards.filter((c) => found[c.id]).length} / ${cards.length}`;

  return (
    <Stage>
      {/* The cards get the screen: no logo, the way back up with the title, little round the edge,
          and the list running on under the home bar to the very bottom. */}
      <div className="flex h-lvh w-full flex-col gap-1 self-start px-3 pt-2">
        <header className="flex items-center justify-between gap-4">
          <BackLink href={backTo} />
          <div role="group" aria-label="View" className="flex rounded-full bg-cosmos-950 p-1 ring-2 ring-cosmos-500 ring-inset">
            {COLLECTION_VIEWS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={option === view}
                onClick={() => setView(option)}
                className={cn(
                  "h-9 rounded-full px-4 text-sm font-black whitespace-nowrap",
                  option === view ? "bg-gold-400 text-cosmos-950" : "text-cosmos-300 hover:text-white",
                )}
              >
                {VIEW_NAMES[option]}
              </button>
            ))}
          </div>
          <h1 className="flex items-baseline gap-2 font-display text-xl font-black tracking-wider whitespace-nowrap text-gold-400 uppercase">
            Collection
            <span className="text-base text-white tabular-nums">{count(ALL_CARDS)}</span>
          </h1>
        </header>

        <div className="scroll-fade-top flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto overscroll-contain pr-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {collectionRows(ALL_CARDS, view).map((row) => (
            <section key={row.name ?? "all"} className="flex gap-2">
              {row.name ? (
                <h2 className="flex w-32 min-w-0 shrink-0 flex-col border-r-2 border-cosmos-500 pt-1 pr-2 text-right font-display text-xs leading-tight font-black wrap-anywhere text-gold-400 uppercase">
                  {row.name}
                  <span className="text-sm text-white tabular-nums">{count(row.cards)}</span>
                </h2>
              ) : null}
              <ul className={CARDS}>
                {row.cards.map((card) => (
                  // A card in two teams is on the page twice, so its row is part of its key.
                  <li key={`${row.name}-${card.id}`}>
                    {found[card.id] ? (
                      <button
                        type="button"
                        aria-label={`${card.name}, recruited ${found[card.id]} times. Show it large`}
                        onClick={(e) => setViewing({ card, from: e.currentTarget.getBoundingClientRect() })}
                        className={cn(SLOT, "block")}
                      >
                        <CardView card={card} className="w-full" />
                        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-400 px-1 fs-2xs font-black text-cosmos-950 tabular-nums">
                          ×{found[card.id]}
                        </span>
                      </button>
                    ) : (
                      <div
                        role="img"
                        aria-label="A card not found yet"
                        className={cn(SLOT, "flex items-center justify-center border-2 border-dashed border-cosmos-500/70 bg-cosmos-950/50")}
                      >
                        <span className="font-display text-2xl font-black text-cosmos-500">?</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

      </div>

      {viewing ? (
        <ZoomedView from={viewing.from} closeLabel={`Close ${viewing.card.name}`} onClose={() => setViewing(null)}>
          <CardView card={viewing.card} className="w-61 rounded-[10%/7.1%]" />
        </ZoomedView>
      ) : null}
    </Stage>
  );
}
