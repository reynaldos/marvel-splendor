"use client";

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
 * How the square tiles are laid out: more than 2 Locations go two to a row,
 * with the Avengers tile on a row of its own beneath. Sizes in spacing steps.
 */
export function tileLayout(locationCount: number, height: number): { columns: 1 | 2; tileSize: number } {
  const columns = locationCount > 2 ? 2 : 1;
  const rows = Math.ceil(locationCount / columns) + 1;
  const fitsHeight = Math.floor((height - GAP * (rows - 1)) / rows);
  const fitsWidth = (RAIL_WIDTH - GAP * (columns - 1)) / columns;
  return { columns, tileSize: Math.max(MIN_TILE, Math.min(MAX_TILE, fitsHeight, fitsWidth)) };
}

/**
 * The Location tiles and the Avengers Assemble tile in the right rail.
 * Tapping a Location shows all of them large; tapping the Avengers tile
 * shows just that.
 */
export function TileRail({ locations, avengersHolder, players, nameForSeat, height }: TileRailProps) {
  const { columns, tileSize } = tileLayout(locations.length, height);
  const size = { width: `calc(var(--spacing) * ${tileSize})` };
  const locationTiles = locations.map((id) => <LocationTile key={id} location={getLocation(id)} />);
  const avengers = (
    <AvengersTile avengersHolder={avengersHolder} players={players} nameForSeat={nameForSeat} />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1">
      <Zoomable
        label="Show location tiles"
        title="Locations"
        className="grid justify-center gap-1"
        style={{ gridTemplateColumns: `repeat(${columns}, calc(var(--spacing) * ${tileSize}))` }}
        zoomed={<div className="flex gap-4 *:w-40">{locationTiles}</div>}
      >
        {locationTiles}
      </Zoomable>
      <Zoomable
        label="Show the Avengers Assemble tile"
        title="Avengers Assemble"
        style={size}
        zoomed={<div className="w-52">{avengers}</div>}
      >
        {avengers}
      </Zoomable>
    </div>
  );
}
