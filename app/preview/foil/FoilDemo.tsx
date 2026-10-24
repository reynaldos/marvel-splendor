"use client";

import { useState, useSyncExternalStore } from "react";
import { cn } from "cn";

import { enableGyro, FoilLayer } from "@/components/Foil";
import { LargeImages } from "@/components/game/assets";
import { CardView } from "@/components/game/Card";
import type { Card } from "@/lib/engine/types";
import { FRAME_EFFECT, FRAME_STYLE, FRAME_TIER_NAMES } from "@/lib/frame-tier";

/**
 * Every tier's frame drawn by the shader, one card each, on one layer over the grid. The light follows the
 * pointer over the grid, or the phone once it is allowed, and drifts on its own otherwise. `tilt` fixes it.
 */
export function FoilDemo({ cards, tilt }: { cards: Card[]; tilt?: [number, number] }) {
  const [gyro, setGyro] = useState(false);
  const hasGyro = useSyncExternalStore(() => () => {}, () => typeof DeviceOrientationEvent !== "undefined", () => false);

  return (
    <div className="flex w-full flex-col gap-2 pr-10">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xs font-black tracking-widest text-gold-400 uppercase">Frames in a shader · move over the cards</h2>
        {hasGyro && !tilt && !gyro ? (
          <button
            onClick={async () => setGyro(await enableGyro())}
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
              <span
                data-foil={tier}
                className={cn("frame-gold relative block aspect-card w-full rounded-frame-lg", FRAME_EFFECT[tier])}
                style={FRAME_STYLE[tier]}
              >
                <CardView card={cards[i]} className="size-full rounded-[10%/7.1%]" />
              </span>
              <span className="fs-2xs font-black">{tier}</span>
              <span className="fs-3xs font-bold text-cosmos-300">{cards[i].name}</span>
            </div>
          ))}
          <FoilLayer tilt={tilt} />
        </div>
      </LargeImages>
    </div>
  );
}
