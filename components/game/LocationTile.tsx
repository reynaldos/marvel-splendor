import { cn } from "cn";

import { STONE_COLORS } from "@/components/game/stone-colors";
import { STONES, type Location } from "@/lib/engine/types";

interface LocationTileProps {
  location: Location;
  /** True while this tile is one of the CHOOSE_LOCATION pending options. */
  selectable?: boolean;
  onClick?: () => void;
  className?: string;
}

/** A Location tile (ARCHITECTURE.md §1 "nobles"): name, requirement pips, points. */
export function LocationTile({ location, selectable, onClick, className }: LocationTileProps) {
  const Comp = selectable && onClick ? "button" : "div";

  return (
    <Comp
      type={selectable && onClick ? "button" : undefined}
      onClick={selectable ? onClick : undefined}
      className={cn(
        "flex w-full flex-col gap-1 rounded-md bg-card p-2 text-left ring-1 ring-foreground/10",
        selectable && "cursor-pointer ring-2 ring-primary hover:bg-muted",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">{location.name}</span>
        <span className="text-xs font-bold">{location.points} pts</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {STONES.filter((s) => (location.requires[s] ?? 0) > 0).map((s) => (
          <span
            key={s}
            className={cn(
              "flex size-4 items-center justify-center rounded-full text-[0.6rem] font-semibold",
              STONE_COLORS[s].swatch,
              STONE_COLORS[s].onSwatch,
            )}
          >
            {location.requires[s]}
          </span>
        ))}
      </div>
    </Comp>
  );
}
