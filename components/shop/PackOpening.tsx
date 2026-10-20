"use client";

import { useState } from "react";
import { cn } from "cn";

import { playSfx } from "@/components/audio";
import { ASSETS } from "@/components/game/assets";
import { AssetImage, hasAsset, LargeImages } from "@/components/game/AssetImage";
import { Card, CardView } from "@/components/game/Card";
import { LocationTile } from "@/components/game/LocationTile";
import { ZoomedView } from "@/components/game/Zoomable";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getCard, getLocation } from "@/lib/engine/data";
import type { Card as CardType, Pack } from "@/lib/engine/types";

const BUTTON = "h-10 rounded-full px-6 font-display text-sm font-black tracking-wide uppercase shadow-lg";
const TITLE = "font-display text-xl font-black tracking-widest text-gold-400 uppercase";
const CORNERS = "rounded-[10%/7.1%]";

/** The back of a card of that level, as the decks show it. */
function Back({ level, className }: { level: CardType["level"]; className?: string }) {
  const back = ASSETS.deckBacks[level];
  return back ? (
    <span className={cn("block aspect-card overflow-hidden ring-1 ring-foreground/10", CORNERS, className)}>
      <AssetImage src={back} alt="" />
    </span>
  ) : (
    <Card faceDown className={cn("w-full", className)} />
  );
}

/**
 * A pack just bought, opened on the night sky: the pack itself first, then its
 * cards in a row, face down and restless, each turned over with a tap, or all
 * at once with Reveal all. A pack of Location tiles has no backs, so its tiles
 * arrive face up.
 */
export function PackOpening({ pack, onClose }: { pack: Pack; onClose: () => void }) {
  const cards = pack.cards.map(getCard);
  const locations = (pack.locations ?? []).map(getLocation);
  const everyCard = () => new Set(cards.map((c) => c.id));
  // With less motion, it opens already dealt and turned over.
  const still = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [opened, setOpened] = useState(still);
  const [revealed, setRevealed] = useState<Set<string>>(() => (still ? everyCard() : new Set()));
  const [viewing, setViewing] = useState<{ card: CardType; from: DOMRect } | null>(null);
  const allShown = revealed.size === cards.length;

  const reveal = (ids: Iterable<string>) => {
    playSfx("flip");
    setRevealed((shown) => new Set([...shown, ...ids]));
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="theme-cosmos dark bg-cosmos inset-0 top-0 left-0 flex h-(--screen-h) w-screen max-w-none translate-x-0 translate-y-0 flex-col items-center justify-center gap-3 rounded-none border-0 p-4 ring-0 sm:max-w-none">
        <DialogTitle className="sr-only">{pack.title} pack</DialogTitle>
        <DialogDescription className="sr-only">The cards in the pack, face down until tapped.</DialogDescription>
        <LargeImages>
          {!opened ? (
            <>
              <p className={TITLE}>{pack.title}</p>
              {/* The pack sits in its rays until tapped. */}
              <button type="button" onClick={() => setOpened(true)} className="result-pop relative flex items-center justify-center outline-none">
                <span aria-hidden className="result-rays absolute size-[220%]" />
                <span className="relative block aspect-square w-[min(14rem,46dvh)] overflow-hidden rounded-3xl shadow-2xl ring-2 ring-gold-400 ring-inset">
                  {hasAsset(pack.cover) ? (
                    <AssetImage src={pack.cover} alt="" className="object-contain" />
                  ) : (
                    <span className="flex size-full items-center justify-center bg-linear-to-b from-cosmos-700 to-cosmos-950 font-display text-6xl font-black text-gold-400">
                      ?
                    </span>
                  )}
                </span>
              </button>
              <p className="font-display text-sm font-black tracking-widest text-white uppercase">Tap to open</p>
            </>
          ) : (
            <>
              <p className={TITLE}>{!allShown ? "Tap a card to reveal it" : locations.length ? `${locations.length} new locations` : `${cards.length} new cards`}</p>
              <ul className="flex flex-wrap items-start justify-center gap-x-5 gap-y-3">
                {locations.map((l, i) => (
                  <li key={l.id} className="card-arrive flex flex-col items-center gap-1.5" style={{ width: "min(8rem, 26dvh)", animationDelay: `${i * 0.1}s` }}>
                    <LocationTile location={l} className="pack-flash" />
                    <span className="h-4 fs-2xs font-bold tracking-wide text-cosmos-300 uppercase">{l.name}</span>
                  </li>
                ))}
                {cards.map((c, i) => {
                  const shown = revealed.has(c.id);
                  return (
                    <li key={c.id} className="card-arrive flex flex-col items-center gap-1.5" style={{ width: "min(8rem, 26dvh)", animationDelay: `${i * 0.1}s` }}>
                      <button
                        type="button"
                        aria-label={shown ? `${c.name}. Show it large` : "Reveal a card"}
                        onClick={(e) => (shown ? setViewing({ card: c, from: e.currentTarget.getBoundingClientRect() }) : reveal([c.id]))}
                        className={cn("block w-full outline-none [perspective:1000px]", CORNERS)}
                      >
                        {/* Two faces back to back; the whole thing turns round when revealed. */}
                        <span
                          className={cn(
                            "relative block aspect-card transition-transform duration-700 [transform-style:preserve-3d]",
                            shown ? "[transform:rotateY(180deg)]" : "pack-wiggle",
                          )}
                        >
                          <Back level={c.level} className="absolute inset-0 [backface-visibility:hidden]" />
                          <CardView card={c} className={cn("absolute inset-0 size-full [transform:rotateY(180deg)] [backface-visibility:hidden]", CORNERS, shown && "pack-flash")} />
                        </span>
                      </button>
                      <span className="h-4 fs-2xs font-bold tracking-wide text-cosmos-300 uppercase">{shown ? c.name : "\u00a0"}</span>
                    </li>
                  );
                })}
              </ul>
              {allShown ? (
                <button type="button" onClick={onClose} className={cn(BUTTON, "mt-2 bg-gold-400 text-cosmos-950 hover:bg-gold-200")}>
                  Done
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => reveal(everyCard())}
                  className={cn(BUTTON, "absolute right-4 bottom-4 h-9 bg-cosmos-700 px-5 text-xs text-white ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500")}
                >
                  Reveal all
                </button>
              )}
            </>
          )}
        </LargeImages>
        {viewing ? (
          <ZoomedView from={viewing.from} closeLabel={`Close ${viewing.card.name}`} onClose={() => setViewing(null)}>
            <CardView card={viewing.card} className={cn("w-[min(15.25rem,60dvh)]", CORNERS)} />
          </ZoomedView>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
