"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";

import { LargeImages } from "@/components/game/assets";
import { CardView } from "@/components/game/Card";
import { ZoomedView } from "@/components/game/Zoomable";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CARD_BY_ID } from "@/lib/engine/data";
import type { Card } from "@/lib/engine/types";
import { FRAME_EFFECT, FRAME_STYLE, type FrameTier } from "@/lib/frame-tier";
import type { GameRewards } from "@/lib/game-record";

/** How long each card is shown as it was, then as it is now, in ms. */
const BEFORE_MS = 1000;
const AFTER_MS = 1700;

const BUTTON = "h-10 rounded-full px-6 font-display text-sm font-black tracking-wide uppercase shadow-lg";

/** A tier's name in its own colour: gold reads gold, ruby reads ruby. Recruited has no colour of its own. */
export function TierName({ tier, className }: { tier: FrameTier; className?: string }) {
  return (
    <span className={cn("font-black", className)} style={{ ...FRAME_STYLE[tier], color: "var(--frame-glow, var(--color-cosmos-300))" }}>
      {tier}
    </span>
  );
}

/** The corners a card drawn large gets, everywhere in the game. */
const CORNERS = "rounded-[10%/7.1%]";

/** A card in a tier's frame, with the light that tier gets. */
function FramedCard({ cardId, tier, className }: { cardId: string; tier: FrameTier; className?: string }) {
  const card = CARD_BY_ID.get(cardId);
  return card ? (
    <span className={cn("frame-gold aspect-card block w-full rounded-frame-lg", FRAME_EFFECT[tier], className)} style={FRAME_STYLE[tier]}>
      <CardView card={card} className={cn("size-full", CORNERS)} />
    </span>
  ) : null;
}

/**
 * The cards that went up a tier, on the night sky over the whole screen: each
 * one rises in as it was, then its new frame flares over it, one after
 * another; then all of them together as they are now. Skip goes straight to that.
 */
export function CardLevelUps({ ups, onClose }: { ups: GameRewards["cardLevelUps"]; onClose: () => void }) {
  // Even stages show a card as it was, odd ones as it is now; the last stage is all of them.
  const done = ups.length * 2;
  const [stage, setStage] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? done : 0,
  );
  useEffect(() => {
    if (stage >= done) return;
    const id = setTimeout(() => setStage(stage + 1), stage % 2 === 0 ? BEFORE_MS : AFTER_MS);
    return () => clearTimeout(id);
  }, [stage, done]);

  const index = Math.floor(stage / 2);
  const up = ups[index];
  const flipped = stage % 2 === 1;
  const [viewing, setViewing] = useState<{ card: Card; from: DOMRect } | null>(null);
  const title = ups.length === 1 ? "1 card ranked up" : `${ups.length} cards ranked up`;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="theme-cosmos dark bg-cosmos inset-0 top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col items-center justify-center gap-3 rounded-none border-0 p-4 ring-0 sm:max-w-none">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">Each card as it was, then as it is now.</DialogDescription>
        {/* Drawn far larger than a board piece, so the art loads sharp. */}
        <LargeImages>
        {stage < done ? (
          <>
            <p className="font-display text-xl font-black tracking-widest text-gold-400 uppercase">{CARD_BY_ID.get(up.cardId)?.name}</p>
            {/* Remade for each card, so it rises in afresh; the new frame flares over the old one. */}
            <div key={index} className="card-arrive relative" style={{ width: "min(13rem, 46dvh)" }}>
              <FramedCard cardId={up.cardId} tier={up.from} className={cn(flipped && "tier-out")} />
              {flipped ? <FramedCard cardId={up.cardId} tier={up.to} className="tier-up absolute inset-0" /> : null}
            </div>
            <p className="h-8 text-2xl">
              {flipped ? <TierName key="to" tier={up.to} className="tier-up inline-block" /> : <TierName key="from" tier={up.from} className="text-lg" />}
            </p>
            <button
              type="button"
              onClick={() => setStage(done)}
              className={cn(BUTTON, "absolute right-4 bottom-4 bg-cosmos-700 text-white ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500")}
            >
              Skip
            </button>
          </>
        ) : (
          <>
            <p className="font-display text-xl font-black tracking-widest text-gold-400 uppercase">{title}</p>
            <ul className="flex flex-wrap items-start justify-center gap-x-5 gap-y-3">
              {ups.map((u, i) => {
                const card = CARD_BY_ID.get(u.cardId);
                return card ? (
                  <li
                    key={u.cardId}
                    className="card-arrive flex flex-col items-center gap-1.5"
                    style={{ width: "min(6.5rem, 20dvh)", animationDelay: `${i * 0.1}s` }}
                  >
                    <button
                      type="button"
                      aria-label={`${card.name}. Show it large`}
                      onClick={(e) => setViewing({ card, from: e.currentTarget.getBoundingClientRect() })}
                      className="block w-full rounded-frame-lg"
                    >
                      <FramedCard cardId={u.cardId} tier={u.to} />
                    </button>
                    <TierName tier={u.to} className="text-xs" />
                  </li>
                ) : null;
              })}
            </ul>
            <button type="button" onClick={onClose} className={cn(BUTTON, "mt-2 bg-gold-400 text-cosmos-950 hover:bg-gold-200")}>
              Done
            </button>
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
