import { cn } from "cn";

import { AssetImage } from "@/components/game/assets";

/**
 * One picture in a tile's art, placed and tilted by `className`. `drift` sets
 * it bobbing, that many seconds into the cycle so pieces don't move as one.
 * The bob moves with `translate`, so it adds to a tilt but replaces a
 * `translate-*` class.
 */
function Piece({ src, className, drift }: { src: string; className: string; drift?: number }) {
  return (
    <span
      className={cn("absolute overflow-hidden shadow-lg", drift !== undefined && "drift", className)}
      style={drift === undefined ? undefined : { animationDelay: `${-drift}s` }}
    >
      <AssetImage src={src} alt="" sizes="18vw" />
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
      <Piece src="/assets/locations/wakanda.png" className="top-10 left-[5%] aspect-square w-28 -rotate-12 rounded-tile" />
      <Piece
        src="/assets/locations/avengers_tower.png"
        className="top-10 right-[5%] aspect-square w-28 rotate-12 rounded-tile"
      />
      <Piece
        src="/assets/avengers-assemble.png"
        className="top-5 left-1/2 aspect-square w-36 -translate-x-1/2 rounded-tile ring-2 ring-gold-400"
      />
    </>
  );
}

// Scattered by hand: mixed sizes, tilts and speeds, the small blurred ones further away.
// `x`/`y` are a share of the screen, `size` is in spacing steps, `pace` is seconds per bob.
const STONES = [
  { stone: "mind", x: 4, y: 12, size: 13, tilt: -18, pace: 7 },
  { stone: "reality", x: 47, y: 2, size: 7, tilt: 25, pace: 9, far: true },
  { stone: "space", x: 41, y: 18, size: 14, tilt: 12, pace: 6 },
  { stone: "soul", x: 6, y: 70, size: 14, tilt: -28, pace: 8 },
  { stone: "power", x: 91, y: 5, size: 13, tilt: 32, pace: 6.5 },
  { stone: "time", x: 94, y: 74, size: 8, tilt: -12, pace: 9.5, far: true },
  { stone: "shield", x: 52, y: 88, size: 6, tilt: 40, pace: 10, far: true },
  { stone: "reality", x: 49, y: 62, size: 9, tilt: -35, pace: 8.5 },
  { stone: "power", x: 17, y: 90, size: 6, tilt: 20, pace: 11, far: true },
];

/** The welcome screen's backdrop: Thanos, with the stones adrift around him. */
export function WelcomeArt() {
  return (
    <>
      {/* Thanos, with his face and the Gauntlet kept clear of everything adrift. */}
      <span className="fade-edges absolute -top-[18%] left-[4%] aspect-[3/4] h-[125%]">
        <AssetImage src="/assets/thanos.png" alt="" sizes="50vw" preload className="object-contain" />
      </span>

      {STONES.map(({ stone, x, y, size, tilt, pace, far }, i) => (
        <span
          key={i}
          className={cn(
            "drift absolute aspect-square overflow-hidden rounded-full shadow-lg",
            far && "opacity-60 blur-[1px]",
          )}
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: `calc(var(--spacing) * ${size})`,
            rotate: `${tilt}deg`,
            animationDuration: `${pace}s`,
            animationDelay: `${-i * 1.7}s`,
          }}
        >
          <AssetImage src={`/assets/stones/${stone}-token.png`} alt="" />
        </span>
      ))}
    </>
  );
}
