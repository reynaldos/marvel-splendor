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
  /** Width of each tile in the rail, in spacing steps. */
  tileSize: number;
}

/**
 * The Location tiles and the Avengers Assemble tile, stacked in the right
 * rail. Tapping a Location shows all of them large; tapping the Avengers
 * tile shows just that.
 */
export function TileRail({ locations, avengersHolder, players, nameForSeat, tileSize }: TileRailProps) {
  const locationTiles = locations.map((id) => <LocationTile key={id} location={getLocation(id)} />);
  const avengers = (
    <AvengersTile avengersHolder={avengersHolder} players={players} nameForSeat={nameForSeat} />
  );

  return (
    <div
      className="mx-auto flex min-h-0 flex-1 flex-col items-center justify-center gap-1"
      style={{ width: `calc(var(--spacing) * ${tileSize})` }}
    >
      <Zoomable
        label="Show location tiles"
        title="Locations"
        className="flex w-full flex-col gap-1"
        zoomed={<div className="flex gap-4 *:w-40">{locationTiles}</div>}
      >
        {locationTiles}
      </Zoomable>
      <Zoomable
        label="Show the Avengers Assemble tile"
        title="Avengers Assemble"
        className="w-full"
        zoomed={<div className="w-52">{avengers}</div>}
      >
        {avengers}
      </Zoomable>
    </div>
  );
}
