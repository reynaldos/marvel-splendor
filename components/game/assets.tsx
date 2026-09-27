import Image from "next/image";
import { cn } from "cn";

import assetsJson from "@/data/assets.json";
import type { CardLevel, TokenColor } from "@/lib/engine/types";

/**
 * Optional board art (data/assets.json). Every entry is `null` until the
 * project owner supplies an image; components draw their placeholder when
 * an entry is unset, so art can be added one item at a time.
 */
export const ASSETS = assetsJson as unknown as {
  tokens: Record<TokenColor, string | null>;
  deckBacks: Record<CardLevel, string | null>;
  avengersTile: string | null;
  avengersIcon: string | null;
  /** The "points to win" tile. Its art prints the number, so it only fits games with that target. */
  winTile: { image: string; points: number } | null;
};

/**
 * Art that fills its (positioned) parent. `sizes` is how wide it is drawn,
 * which picks the resolution to load; the default is sharp enough for a
 * card or tile opened large.
 */
export function AssetImage({
  src,
  alt,
  sizes = "25vw",
  className,
}: {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
}) {
  return (
    <Image src={src} alt={alt} fill sizes={sizes} className={cn("object-cover", className)} draggable={false} />
  );
}

/** The Avengers emblem: the supplied icon, or a drawn "A" badge. Size it with `className`. */
export function AvengersIcon({ className }: { className?: string }) {
  return ASSETS.avengersIcon ? (
    <span title="Avengers" className={cn("relative block shrink-0", className)}>
      <AssetImage src={ASSETS.avengersIcon} alt="Avengers" className="object-contain" />
    </span>
  ) : (
    <span
      title="Avengers"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-white font-black text-red-600 ring-1 ring-black/30",
        className,
      )}
    >
      A
    </span>
  );
}
