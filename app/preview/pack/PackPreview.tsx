"use client";

import { useState } from "react";
import { cn } from "cn";

import { PackOpening } from "@/components/shop/PackOpening";
import { Stage, StageRows } from "@/components/Stage";
import { PACKS } from "@/lib/engine/data";

import { PreviewBarRow } from "../PreviewBar";

/** Every pack on sale, each with a button that opens it afresh. */
export function PackPreview() {
  // Counts the openings, so each one is a new popup that plays from the start.
  const [showing, setShowing] = useState<{ id: string; n: number } | null>(null);
  const pack = showing ? PACKS.find((p) => p.id === showing.id) : null;

  return (
    <Stage>
      <StageRows>
        <h1 className="font-display text-2xl font-black tracking-widest text-gold-400 uppercase">Pack opening preview</h1>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {PACKS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setShowing((s) => ({ id: p.id, n: (s?.n ?? 0) + 1 }))}
              className={cn("h-11 rounded-full bg-gold-400 px-6 font-display text-sm font-black tracking-wide text-cosmos-950 uppercase hover:bg-gold-200")}
            >
              Open {p.title}
            </button>
          ))}
        </div>
        <PreviewBarRow />
      </StageRows>
      {pack && showing ? <PackOpening key={showing.n} pack={pack} onClose={() => setShowing(null)} /> : null}
    </Stage>
  );
}
