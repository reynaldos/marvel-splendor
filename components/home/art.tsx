import { cn } from "cn";

import { AssetImage } from "@/components/game/assets";

/** One picture in a tile's art, placed and tilted by `className`. */
function Piece({ src, className }: { src: string; className: string }) {
  return (
    <span className={cn("absolute overflow-hidden shadow-lg", className)}>
      <AssetImage src={src} alt="" />
    </span>
  );
}

const CARD = "aspect-card w-27 rounded-lg ring-1 ring-black/40";

/** A hand of heroes. */
export function CardFanArt() {
  return (
    <>
      <Piece src="/cards/thor.png" className={cn(CARD, "top-7 left-[7%] -rotate-12")} />
      <Piece src="/cards/captain-america.png" className={cn(CARD, "top-7 right-[7%] rotate-12")} />
      <Piece src="/cards/iron-man.png" className={cn(CARD, "top-3 left-1/2 w-30 -translate-x-1/2")} />
    </>
  );
}

/** The Avengers, at home. */
export function AvengersArt() {
  return (
    <>
      <Piece src="/assets/locations/wakanda.png" className="top-10 left-[5%] aspect-square w-28 -rotate-12 rounded-xl" />
      <Piece
        src="/assets/locations/avengers_tower.png"
        className="top-10 right-[5%] aspect-square w-28 rotate-12 rounded-xl"
      />
      <Piece
        src="/assets/avengers-assemble.png"
        className="top-5 left-1/2 aspect-square w-36 -translate-x-1/2 rounded-xl ring-2 ring-gold-400"
      />
    </>
  );
}
