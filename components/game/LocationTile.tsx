import { cn } from "cn";

import { AssetImage } from "@/components/game/assets";
import { STONE_COLORS } from "@/components/game/stone-colors";
import { STONES, type Location } from "@/lib/engine/types";

interface LocationTileProps {
  location: Location;
  /** True while this tile is one of the CHOOSE_LOCATION pending options. */
  selectable?: boolean;
  onClick?: () => void;
  /** Pass a width (`w-*`) to resize; the tile stays square and its face scales. */
  className?: string;
}

/**
 * A Location tile (ARCHITECTURE.md §1 "nobles"), square like the physical
 * tile: points top-left, required card bonuses stacked down the right,
 * name along the bottom. Sized in `cqw` so it holds up at any width. A
 * location with an `image` shows only that art, which carries all three.
 */
export function LocationTile({ location, selectable, onClick, className }: LocationTileProps) {
  const Comp = selectable && onClick ? "button" : "div";

  return (
    <Comp
      type={selectable && onClick ? "button" : undefined}
      onClick={selectable ? onClick : undefined}
      className={cn(
        "@container relative block aspect-square w-full overflow-hidden rounded-xl bg-muted text-left ring-1 ring-foreground/10",
        selectable && "cursor-pointer ring-2 ring-primary hover:brightness-110",
        className,
      )}
    >
      {location.image ? (
        <AssetImage src={location.image} alt={location.name} />
      ) : (
        <>
          <span
            className="absolute top-[4cqw] left-[7cqw] text-[length:28cqw] leading-none font-black"
            title="Points"
          >
            {location.points}
          </span>

          <span className="absolute top-[5cqw] right-[5cqw] flex flex-col gap-[3cqw]">
            {STONES.filter((s) => (location.requires[s] ?? 0) > 0).map((s) => (
              <span
                key={s}
                title={`${STONE_COLORS[s].label} cards needed`}
                className={cn(
                  "flex size-[22cqw] items-center justify-center rounded-[4cqw] text-[length:15cqw] font-bold ring-1 ring-black/30",
                  STONE_COLORS[s].swatch,
                  STONE_COLORS[s].onSwatch,
                )}
              >
                {location.requires[s]}
              </span>
            ))}
          </span>

          <span className="absolute bottom-0 left-0 line-clamp-2 w-[68cqw] bg-black/60 px-[5cqw] py-[3cqw] text-[length:10.5cqw] leading-tight font-bold text-white uppercase">
            {location.name}
          </span>
        </>
      )}
    </Comp>
  );
}
