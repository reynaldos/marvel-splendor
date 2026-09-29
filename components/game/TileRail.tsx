"use client";

import { LargeImages } from "@/components/game/assets";
import { AvengersTile } from "@/components/game/AvengersTile";
import { LocationTile } from "@/components/game/LocationTile";
import { Zoomable } from "@/components/game/Zoomable";
import { getLocation } from "@/lib/engine/data";
import type { RedactedPlayerState } from "@/lib/game-view";

interface TileRailProps {
  locations: string[];
  avengersHolder: number | null;
  players: RedactedPlayerState[];
  nameForSeat: (seat: number) => string;
  /** Room the rail has to fill, top to bottom, in spacing steps. */
  height: number;
}

/** The rail's width, and the gap between tiles, in spacing steps. */
const RAIL_WIDTH = 32;
const GAP = 1;
/** Tiles are never drawn smaller than this, or their numbers can't be read. */
const MIN_TILE = 13;
/** A market card's width, so a game with few tiles isn't oversized. */
const MAX_TILE = 16;

/**
 * How the square tiles are laid out. Up to 2 Locations share one column with
 * the Avengers tile under them. More make two columns: the Avengers tile ends
 * the second, and the first takes the extra Location when they don't split
 * evenly. Sizes in spacing steps.
 */
export function tileLayout(
  locationCount: number,
  height: number,
): { firstColumn: number; columns: 1 | 2; tileSize: number } {
  const columns = locationCount > 2 ? 2 : 1;
  const firstColumn = columns === 1 ? locationCount : Math.ceil((locationCount + 1) / 2);
  const rows = columns === 1 ? locationCount + 1 : firstColumn;
  const fitsHeight = Math.floor((height - GAP * (rows - 1)) / rows);
  const fitsWidth = (RAIL_WIDTH - GAP * (columns - 1)) / columns;
  return { firstColumn, columns, tileSize: Math.max(MIN_TILE, Math.min(MAX_TILE, fitsHeight, fitsWidth)) };
}

/**
 * The Location tiles and the Avengers Assemble tile in the right rail.
 * Tapping a Location shows all of them large; tapping the Avengers tile
 * shows just that.
 */
export function TileRail({ locations, avengersHolder, players, nameForSeat, height }: TileRailProps) {
  const { firstColumn, columns, tileSize } = tileLayout(locations.length, height);
  const width = { width: `calc(var(--spacing) * ${tileSize})` };
  const tiles = locations.map((id) => <LocationTile key={id} location={getLocation(id)} />);
  const avengers = (
    <AvengersTile avengersHolder={avengersHolder} players={players} nameForSeat={nameForSeat} />
  );
  const locationGroup = (group: typeof tiles) =>
    group.length > 0 ? (
      <Zoomable
        label="Show location tiles"
        title="Locations"
        className="flex flex-col gap-1"
        zoomed={<div className="flex gap-4 *:w-40 *:rounded-3xl">{tiles}</div>}
      >
        {group}
      </Zoomable>
    ) : null;
  const avengersTile = (
    <Zoomable
      label="Show the Avengers Assemble tile"
      title="Avengers Assemble"
      zoomed={<div className="w-52 *:rounded-3xl">{avengers}</div>}
    >
      {avengers}
    </Zoomable>
  );

  return (
    // Loaded large enough to be carried to the middle of the screen when one is claimed.
    <LargeImages sizes="22vw">
    <div className="flex min-h-0 flex-1 items-center justify-center gap-1">
      <div className="flex flex-col gap-1" style={width}>
        {locationGroup(tiles.slice(0, firstColumn))}
        {columns === 1 ? avengersTile : null}
      </div>
      {columns === 2 ? (
        <div className="flex flex-col gap-1" style={width}>
          {locationGroup(tiles.slice(firstColumn))}
          {avengersTile}
        </div>
      ) : null}
    </div>
    </LargeImages>
  );
}
