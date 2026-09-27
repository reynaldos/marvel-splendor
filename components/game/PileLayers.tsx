import type { ReactNode } from "react";
import { cn } from "cn";

// Nearest the top first; each copy a little darker than the one above.
const SHADE = ["brightness-90", "brightness-75", "brightness-60"];

/** How many pieces peek out under the top one, up to `max`. */
export function pileDepth(count: number, max: number): number {
  return Math.max(0, Math.min(count - 1, max, SHADE.length));
}

/**
 * Copies of a pile's top piece, each offset (and optionally turned) from
 * the one above with a thin dark edge between, so more than one reads as a
 * stack. Goes inside a
 * positioned parent, before the top piece.
 */
export function PileLayers({
  count,
  max,
  dx = 0,
  dy,
  tilt = 0,
  className,
  children,
}: {
  count: number;
  /** The most copies to draw, however big the pile. */
  max: number;
  /** How far each copy sits right of and below the one above, in spacing steps. */
  dx?: number;
  dy: number;
  /** Degrees each copy is turned from the one above. It pivots on its
   * bottom-right corner, so the pile fans out at the top right. */
  tilt?: number;
  /** The size of one piece. */
  className: string;
  children: ReactNode;
}) {
  const depth = pileDepth(count, max);
  // Deepest first, so each nearer copy is drawn over it.
  return Array.from({ length: depth }, (_, i) => depth - i).map((n) => (
    <span
      key={n}
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-0 left-0 origin-bottom-right drop-shadow-[0_1px_0_rgb(0_0_0/0.7)]",
        SHADE[n - 1],
        className,
      )}
      style={{
        translate: `calc(var(--spacing) * ${dx * n}) calc(var(--spacing) * ${dy * n})`,
        rotate: `${tilt * n}deg`,
      }}
    >
      {children}
    </span>
  ));
}
