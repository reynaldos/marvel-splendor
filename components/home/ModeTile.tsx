import type { ComponentProps, ReactNode } from "react";
import { cn } from "cn";

interface ModeTileProps extends ComponentProps<"button"> {
  label: string;
  /** Tailwind gradient stops for the tile's face, e.g. "from-red-500 to-orange-700". */
  tone: string;
  /** The picture filling the top of the tile. */
  art: ReactNode;
}

/** One big way-to-play button: art on top, its name on a pill below. */
export function ModeTile({ label, tone, art, className, ...props }: ModeTileProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "group relative flex h-full flex-1 flex-col items-center justify-end rounded-3xl bg-linear-to-b p-3 shadow-xl ring-2 ring-white/20 transition-transform outline-none ring-inset hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-gold-400 active:translate-y-0",
        tone,
        className,
      )}
    >
      <span className="absolute inset-x-0 top-0 bottom-14 transition-transform group-hover:scale-105">{art}</span>
      <span className="relative w-full rounded-full bg-black/45 py-1.5 font-display text-base font-black tracking-wide text-white uppercase ring-2 ring-white/30">
        {label}
      </span>
    </button>
  );
}
