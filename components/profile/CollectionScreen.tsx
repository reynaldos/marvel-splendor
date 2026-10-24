"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "cn";
import { Lock } from "lucide-react";

import { BackLink } from "@/components/BackLink";
import { FoilLayer } from "@/components/Foil";
import { CardView } from "@/components/game/Card";
import { TierName } from "@/components/game/CardLevelUps";
import { ZoomedView } from "@/components/game/Zoomable";
import { Stage } from "@/components/Stage";
import { cardFrameTier } from "@/lib/card-level";
import { COLLECTION_VIEWS, collectionRows, type CollectionView } from "@/lib/collection-views";
import { ALL_CARDS, PACK_BY_ID, packOf } from "@/lib/engine/data";
import type { Card } from "@/lib/engine/types";
import { FRAME_EFFECT, FRAME_STYLE } from "@/lib/frame-tier";

const VIEW_NAMES: Record<CollectionView, string> = { grid: "Grid", level: "Level", group: "Group", alliance: "Alliance" };
const SLOT = "relative aspect-card w-full rounded-frame";
const FRAME_HIDDEN_KEY = "collection-frame-hidden";
// Whether the grid's frames get the shader's full light. Off, they get only its border and glow: a hundred faces redrawn every frame dragged on a phone.
const GRID_FOIL = false;
// As many cards across as fit, each stretched a little so the row is filled from edge to edge.
const CARDS = "grid flex-1 grid-cols-[repeat(auto-fill,minmax(calc(var(--spacing)*14),1fr))] gap-3";

/**
 * A found card as the grid shows it: in the frame of its tier, with its count cut as a gem. Large, its
 * corners grow with it and the shader draws the frame over it, the CSS frame under it as the fallback; in
 * the grid the face is left alone unless `GRID_FOIL`. Locked, from a pack the player doesn't own, it is
 * greyed under a lock.
 */
function FoundCard({ card, count, large, locked }: { card: Card; count: number; large?: boolean; locked?: boolean }) {
  const tier = cardFrameTier(card.id, count);
  return (
    <span
      data-foil={locked ? undefined : tier}
      data-foil-plain={large || GRID_FOIL ? undefined : ""}
      className={cn(large ? "relative aspect-card w-61 rounded-frame-lg" : SLOT, "frame-gold block", FRAME_EFFECT[tier])}
      style={FRAME_STYLE[tier]}
    >
      <CardView card={card} className={cn("size-full", large && "rounded-[10%/7.1%]", locked && "opacity-70 blur-[3px] grayscale")} />
      {large && !locked ? <FoilLayer /> : null}
      {locked ? (
        <span aria-label="Locked" className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-cosmos-950/40">
          <Lock className="size-6 text-cosmos-300 drop-shadow-md" />
        </span>
      ) : null}
      <span
        className={cn(
          "gem-badge absolute z-10 flex items-center justify-center px-1 font-black text-white tabular-nums",
          large ? "-top-2 -right-2 h-8 min-w-8 text-sm" : "-top-1.5 -right-1.5 h-6 min-w-6 fs-2xs",
        )}
      >
        ×{count}
      </span>
    </span>
  );
}

interface CollectionScreenProps {
  /** How many times the player has recruited each card they have found, by card id. */
  found: Record<string, number>;
  /** The packs the player owns; a found card from any other pack stays locked. */
  packs: string[];
  /** The profile it belongs to, for the way back. */
  backTo: string;
}

/**
 * Every card in the game: the ones the player has recruited are shown, and
 * the rest are empty spaces marked with a question mark. Seen as one grid,
 * or in rows by level, by group or by alliance.
 */
export function CollectionScreen({ found, packs, backTo }: CollectionScreenProps) {
  const [view, setView] = useState<CollectionView>("grid");
  // Shown large from here, not from inside the list, whose faded edges would cut it off.
  const [viewing, setViewing] = useState<{ card: Card; from: DOMRect } | null>(null);
  // Remembered on the device, like the sound settings.
  const [frameHidden, setFrameHidden] = useState(() => {
    try {
      return localStorage.getItem(FRAME_HIDDEN_KEY) === "1";
    } catch {
      return false;
    }
  });
  const hideFrame = (hidden: boolean) => {
    setFrameHidden(hidden);
    try {
      localStorage.setItem(FRAME_HIDDEN_KEY, hidden ? "1" : "0");
    } catch {}
  };
  const viewingTier = viewing && cardFrameTier(viewing.card.id, found[viewing.card.id]);
  /** The pack a card is sold in, when the player doesn't own it. */
  const lockedBy = (card: Card) => {
    const pack = packOf(card.id);
    return pack && !packs.includes(pack) ? PACK_BY_ID.get(pack) : undefined;
  };
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

        {/* Runs out to the screen's edge and pads back in, so the frames' glow isn't cut off at the sides. */}
        <div className="scroll-fade-top -mx-3 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>section+section]:mt-7">
          <FoilLayer sticky />
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
                        aria-label={lockedBy(card) ? "A locked card" : `${card.name}, recruited ${found[card.id]} times. Show it large`}
                        onClick={(e) => setViewing({ card, from: e.currentTarget.getBoundingClientRect() })}
                        className="block w-full"
                      >
                        <FoundCard card={card} count={found[card.id]} locked={Boolean(lockedBy(card))} />
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

      {viewing && lockedBy(viewing.card) ? (
        // Nothing about the card itself: only that it is locked, and where the key is.
        <ZoomedView from={viewing.from} closeLabel="Close" onClose={() => setViewing(null)}>
          <div className="flex w-72 flex-col items-center gap-4 rounded-2xl bg-cosmos-950/90 p-6 text-center ring-3 ring-cosmos-500 ring-inset">
            <span className="flex size-16 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset">
              <Lock className="size-8" />
            </span>
            <span className="font-display text-base font-black tracking-widest text-gold-400 uppercase">Locked</span>
            <span className="text-sm font-bold text-white">
              This card is in the {lockedBy(viewing.card)!.title} pack, which is available for purchase in the shop!
            </span>
            <Link
              href="/shop"
              className="pointer-events-auto flex h-10 items-center justify-center rounded-full bg-gold-400 px-6 font-display text-sm font-black tracking-wide whitespace-nowrap text-cosmos-950 uppercase hover:bg-gold-200"
            >
              Open the shop
            </Link>
          </div>
        </ZoomedView>
      ) : viewing && viewingTier ? (
        <ZoomedView from={viewing.from} closeLabel={`Close ${viewing.card.name}`} onClose={() => setViewing(null)}>
          <div className="flex items-stretch gap-5">
            {/* Just as the grid shows it, or the plain art with its ranking hidden. */}
            {frameHidden ? (
              <CardView card={viewing.card} className="w-61 rounded-[10%/7.1%]" />
            ) : (
              <FoundCard card={viewing.card} count={found[viewing.card.id]} large />
            )}
            {/* The card's height, with its rank at the top, the button at the foot and the rest between. */}
            <div className="flex w-44 flex-col justify-between gap-4 py-1 font-display uppercase">
              <TierName tier={viewingTier} className={cn("text-sm tracking-wider", frameHidden && "invisible")} />
              <div className="flex flex-col gap-1">
                <span className="text-lg leading-tight font-black tracking-wide text-gold-400">{viewing.card.name}</span>
                <span className="text-xs leading-snug font-black text-cosmos-300">{viewing.card.groups.join(" · ")}</span>
              </div>
              <button
                type="button"
                onClick={() => hideFrame(!frameHidden)}
                className="pointer-events-auto h-9 rounded-full bg-cosmos-950 px-4 text-sm font-black whitespace-nowrap text-cosmos-300 ring-2 ring-cosmos-500 ring-inset hover:text-white"
              >
                {frameHidden ? "Show ranking" : "Hide ranking"}
              </button>
            </div>
          </div>
        </ZoomedView>
      ) : null}
    </Stage>
  );
}
