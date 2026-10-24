"use client";

import { useState, useSyncExternalStore } from "react";
import { cn } from "cn";

import { FoilLayer, hasGyro, setMotionFrames, useMotionFrames } from "@/components/Foil";
import { LargeImages } from "@/components/game/assets";
import { CardView } from "@/components/game/Card";
import { ZoomedView } from "@/components/game/Zoomable";
import type { Card } from "@/lib/engine/types";
import { FRAME_EFFECT, FRAME_STYLE, FRAME_TIER_NAMES, type FrameTier } from "@/lib/frame-tier";

/**
 * Every tier's frame drawn by the shader, one card each, on one layer over the grid. The light follows the
 * pointer over the grid, or the phone once it is allowed, and drifts on its own otherwise. `tilt` fixes it.
 * Tapping a card opens it large, framed the way the collection frames it.
 */
export function FoilDemo({ cards, tilt }: { cards: Card[]; tilt?: [number, number] }) {
  const gyro = useMotionFrames();
  const tiltable = useSyncExternalStore(() => () => {}, hasGyro, () => false);
  const [viewing, setViewing] = useState<{ tier: FrameTier; card: Card; from: DOMRect } | null>(null);

  return (
    <div className="flex w-full flex-col gap-2 pr-10">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xs font-black tracking-widest text-gold-400 uppercase">Frames in a shader · move over the cards</h2>
        {tiltable && !tilt && !gyro ? (
          <button
            onClick={() => setMotionFrames(true)}
            className="rounded-full bg-gold-400 px-4 py-1 font-display text-xs font-black text-cosmos-950 uppercase"
          >
            Tilt with phone
          </button>
        ) : null}
      </div>
      {/* Drawn far larger than a board piece, so the art loads sharp. */}
      <LargeImages sizes="15vw">
        <div className="relative grid grid-cols-5 gap-x-3 gap-y-1 justify-items-center">
          {FRAME_TIER_NAMES.map((tier, i) => (
            <div key={tier} className="flex w-24 flex-col items-center gap-0.5">
              <button
                type="button"
                aria-label={`Show ${cards[i].name} large`}
                data-foil={tier}
                onClick={(e) => setViewing({ tier, card: cards[i], from: e.currentTarget.getBoundingClientRect() })}
                className={cn("frame-gold relative block aspect-card w-full rounded-frame-lg", FRAME_EFFECT[tier])}
                style={FRAME_STYLE[tier]}
              >
                <CardView card={cards[i]} className="size-full rounded-[10%/7.1%]" />
              </button>
              <span className="fs-2xs font-black">{tier}</span>
              <span className="fs-3xs font-bold text-cosmos-300">{cards[i].name}</span>
            </div>
          ))}
          <FoilLayer tilt={tilt} />
        </div>
      </LargeImages>

      {viewing ? (
        <ZoomedView from={viewing.from} closeLabel={`Close ${viewing.card.name}`} onClose={() => setViewing(null)}>
          <div className="flex items-stretch gap-5">
            <span
              data-foil={viewing.tier}
              className={cn("frame-gold relative block aspect-card w-61 rounded-frame-lg", FRAME_EFFECT[viewing.tier])}
              style={FRAME_STYLE[viewing.tier]}
            >
              <CardView card={viewing.card} className="size-full rounded-[10%/7.1%]" />
              <FoilLayer tilt={tilt} />
            </span>
            <div className="flex w-44 flex-col gap-1 py-1 font-display uppercase">
              <span className="text-sm tracking-wider text-cosmos-300">{viewing.tier}</span>
              <span className="text-lg leading-tight font-black tracking-wide text-gold-400">{viewing.card.name}</span>
              <span className="text-xs leading-snug font-black text-cosmos-300">{viewing.card.groups.join(" · ")}</span>
            </div>
          </div>
        </ZoomedView>
      ) : null}
    </div>
  );
}
