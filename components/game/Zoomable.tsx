"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "cn";

import { playSfx } from "@/components/audio";
import { LargeImages } from "@/components/game/assets";
import { glideFrom, lessMotion } from "@/components/game/glide";

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
  // Where it sat when tapped, for the enlarged view to come from; null while closed.
  const [from, setFrom] = useState<DOMRect | null>(null);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          playSfx("flip");
          setFrom(e.currentTarget.getBoundingClientRect());
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.stopPropagation();
          playSfx("flip");
          setFrom(e.currentTarget.getBoundingClientRect());
        }}
        className={cn("cursor-pointer", className)}
        style={style}
      >
        {children}
      </div>

      {from ? (
        <ZoomedView from={from} title={title} interactive={interactive} onClose={() => setFrom(null)}>
          {zoomed}
        </ZoomedView>
      ) : null}
    </>
  );
}

interface ZoomedViewProps {
  /** Where on the board it comes from. */
  from: DOMRect;
  title?: string;
  interactive?: boolean;
  /** What closing it says, for screen readers. */
  closeLabel?: string;
  /** Called as it starts to go, and once it has gone. */
  onClosing?: () => void;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Something shown large over a dimmed board. It glides to the middle of the
 * screen from its place on the board, and fades away when tapped.
 */
export function ZoomedView({ from, title, interactive, closeLabel = "Close", onClosing, onClose, children }: ZoomedViewProps) {
  const [closing, setClosing] = useState(false);
  const piece = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const flight = piece.current && glideFrom(piece.current, from, 350);
    return () => flight?.cancel();
  }, [from]);

  const close = () => {
    onClosing?.();
    // With nothing to watch fade, it just goes.
    if (lessMotion()) onClose();
    else setClosing(true);
  };

  return (
    <div
      className={cn("fixed inset-0 z-50 flex flex-col items-center justify-center gap-6", closing && "zoom-out")}
      // Taps in here are for this view, not whatever it sits inside.
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") close();
      }}
      onAnimationEnd={(e) => {
        if (e.animationName === "zoom-out") onClose();
      }}
    >
      <button
        type="button"
        autoFocus
        aria-label={closeLabel}
        className="zoom-dim absolute inset-0 cursor-default bg-black/75 outline-none backdrop-blur-xs"
        onClick={close}
      />
      {title ? (
        <h2 className="zoom-dim pointer-events-none relative font-display text-2xl font-black tracking-widest text-gold-400 uppercase">
          {title}
        </h2>
      ) : null}
      {/* Taps fall through to the backdrop: there is nothing to pick here. */}
      <div ref={piece} className={cn("relative", !interactive && "pointer-events-none")}>
        <LargeImages>{children}</LargeImages>
      </div>
    </div>
  );
}
