"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "cn";

import { LargeImages } from "@/components/game/assets";

interface ZoomableProps {
  /** What tapping does, for screen readers: "Show location tiles". */
  label: string;
  /** Heading over the enlarged view; omit for none. */
  title?: string;
  /** The enlarged view, centered on a dimmed board. */
  zoomed: ReactNode;
  /** The enlarged view takes touches itself (to be swiped), so only a tap outside it closes. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Makes something too small to read on a phone tappable: tapping it dims
 * the board and shows `zoomed` large in the middle; tapping anywhere closes
 * it. Look-only — for anything the player can act on, see Card. One inside
 * another works: a tap opens only the innermost.
 */
export function Zoomable({ label, title, zoomed, interactive, className, style, children }: ZoomableProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn("cursor-pointer", className)}
        style={style}
      >
        {children}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6"
          // Taps in here are for this view, not whatever it sits inside.
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <button
            type="button"
            autoFocus
            aria-label="Close"
            className="absolute inset-0 cursor-default bg-black/75 outline-none backdrop-blur-xs"
            onClick={() => setOpen(false)}
          />
          {title ? (
            <h2 className="pointer-events-none relative font-display text-2xl font-black tracking-widest text-gold-400 uppercase">
              {title}
            </h2>
          ) : null}
          {/* Taps fall through to the backdrop: there is nothing to pick here. */}
          <div className={cn("relative", !interactive && "pointer-events-none")}>
            <LargeImages>{zoomed}</LargeImages>
          </div>
        </div>
      ) : null}
    </>
  );
}
