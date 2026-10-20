"use client";

import { useState } from "react";
import { cn } from "cn";
import { ChevronLeft, ChevronRight, CircleHelp, X } from "lucide-react";

import { playSfx } from "@/components/audio";
import { LargeImages } from "@/components/game/assets";
import { SLIDES } from "@/components/home/how-to-slides";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const ROUND =
  "flex size-14 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset outline-none hover:bg-cosmos-500 focus-visible:ring-gold-400";
const ARROW =
  "absolute top-1/2 z-10 -translate-y-1/2 text-gold-400 outline-none hover:text-gold-200 focus-visible:text-gold-200 disabled:invisible";

/** The help button and, once tapped, the rules as a slideshow over the night sky. `preview` opens it on that slide from the start. */
export function HowToPlay({ preview }: { preview?: number }) {
  const [open, setOpen] = useState(preview !== undefined);
  const [at, setAt] = useState(preview ?? 0);
  const last = SLIDES.length - 1;

  const go = (to: number) => {
    if (to < 0 || to > last) return;
    const sfx = SLIDES[to].sfx;
    if (sfx) playSfx(sfx);
    setAt(to);
  };

  return (
    <>
      <button
        type="button"
        aria-label="How to play"
        onClick={() => {
          setAt(0);
          setOpen(true);
        }}
        className={ROUND}
      >
        <CircleHelp className="size-6" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(at + 1);
            else if (e.key === "ArrowLeft") go(at - 1);
          }}
          className="stage theme-cosmos dark top-0 left-0 flex h-(--screen-h) w-dvw max-w-none sm:max-w-none translate-x-0 translate-y-0 flex-col items-center justify-center gap-0 rounded-none bg-cosmos p-0 text-base text-white ring-0"
        >
          <div className="absolute inset-0 bg-black/55" />
          <DialogTitle className="sr-only">How to play</DialogTitle>
          <DialogDescription className="sr-only">The rules, a slide at a time. Use the arrows to move between them.</DialogDescription>

          <div className="relative flex h-100 w-full max-w-200 flex-col items-center">
            <DialogClose aria-label="Close" className={cn(ROUND, "absolute top-4 right-4 z-10")}>
              <X className="size-6" />
            </DialogClose>
            <button type="button" aria-label="Previous" disabled={at === 0} onClick={() => go(at - 1)} className={cn(ARROW, "left-4")}>
              <ChevronLeft className="size-14" strokeWidth={2.5} />
            </button>
            <button type="button" aria-label="Next" disabled={at === last} onClick={() => go(at + 1)} className={cn(ARROW, "right-4")}>
              <ChevronRight className="size-14" strokeWidth={2.5} />
            </button>

            {/* Keyed on the slide so its pieces animate in afresh each time. */}
            <div key={at} className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-6 px-24">
              <LargeImages sizes="20vw">
                <div className="relative flex h-56 w-full items-center justify-center">{SLIDES[at].art}</div>
              </LargeImages>
              <p className="card-arrive max-w-160 text-center text-lg leading-snug font-bold" style={{ animationDelay: "0.5s" }}>
                {SLIDES[at].text}
              </p>
            </div>

            <div className="flex pb-4">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Slide ${i + 1} of ${SLIDES.length}`}
                  aria-current={i === at ? "step" : undefined}
                  onClick={() => go(i)}
                  className="group p-1.5 outline-none"
                >
                  <span className={cn("block size-2.5 rounded-full ring-1 ring-gold-400 group-focus-visible:ring-2", i === at && "bg-gold-400")} />
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
