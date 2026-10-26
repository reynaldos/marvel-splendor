import type { CSSProperties } from "react";
import { cn } from "cn";

import { AssetImage } from "@/components/game/assets";

/**
 * One picture in a tile's art, placed and tilted by `className`. `drift` sets
 * it bobbing, that many seconds into the cycle so pieces don't move as one.
 * The bob moves with `translate`, so it adds to a tilt but replaces a
 * `translate-*` class.
 */
function Piece({ src, className, drift, style }: { src: string; className: string; drift?: number; style?: CSSProperties }) {
  return (
    <span
      className={cn("absolute overflow-hidden shadow-lg", drift !== undefined && "drift", className)}
      style={{ ...style, ...(drift === undefined ? undefined : { animationDelay: `${-drift}s` }) }}
    >
      <AssetImage src={src} alt="" sizes="18vw" />
    </span>
  );
}

const CARD = "aspect-card w-27 rounded-lg ring-1 ring-black/40";

/** A hand of heroes, fanned round the middle of the tile whatever its width. */
export function CardFanArt() {
  return (
    <span className="absolute inset-0 flex items-start justify-center pt-3">
      <Piece src="/cards/hulk.png" className={cn(CARD, "relative top-4 -mr-6 -rotate-12")} />
      <Piece src="/cards/iron-man.png" className={cn(CARD, "relative z-10 w-30")} />
      <Piece src="/cards/captain-america.png" className={cn(CARD, "relative top-4 -ml-6 rotate-12")} />
    </span>
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

interface Stone {
  stone: string;
  /** A share of the screen, from the left and from the top. */
  x: number;
  y: number;
  /** In spacing steps. */
  size: number;
  tilt: number;
  /** Seconds per bob. */
  pace: number;
  /** Small and blurred, as if further away. */
  far?: boolean;
}

// Scattered by hand, clear of Thanos's face and the Gauntlet: mixed sizes, tilts and speeds.
const STONES: Stone[] = [
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

// The same for a phone held upright: spread from top to bottom, round Thanos, the name and the line under it.
const STONES_UPRIGHT: Stone[] = [
  { stone: "mind", x: 7, y: 5, size: 24, tilt: -18, pace: 7 },
  { stone: "soul", x: 36, y: 13, size: 11, tilt: 30, pace: 10, far: true },
  { stone: "reality", x: 62, y: 3, size: 13, tilt: 25, pace: 9, far: true },
  { stone: "space", x: 80, y: 11, size: 26, tilt: 12, pace: 6 },
  { stone: "power", x: 2, y: 27, size: 17, tilt: 32, pace: 6.5 },
  { stone: "soul", x: 87, y: 34, size: 20, tilt: -28, pace: 8 },
  { stone: "time", x: 3, y: 55, size: 13, tilt: -12, pace: 9.5, far: true },
  { stone: "reality", x: 89, y: 55, size: 16, tilt: -35, pace: 8.5 },
  { stone: "space", x: 2, y: 68, size: 12, tilt: -22, pace: 9, far: true },
  { stone: "shield", x: 91, y: 73, size: 10, tilt: 18, pace: 10.5, far: true },
  { stone: "power", x: 6, y: 91, size: 22, tilt: 20, pace: 7.5 },
  { stone: "shield", x: 45, y: 95, size: 10, tilt: 40, pace: 10, far: true },
  { stone: "mind", x: 78, y: 92, size: 20, tilt: 15, pace: 8 },
];

// On its side, with Thanos in the middle: spread from edge to edge, either side of him.
const STONES_WIDE: Stone[] = [
  { stone: "mind", x: 4, y: 9, size: 14, tilt: -18, pace: 7 },
  { stone: "reality", x: 20, y: 4, size: 7, tilt: 25, pace: 9, far: true },
  { stone: "space", x: 25, y: 30, size: 12, tilt: 12, pace: 6 },
  { stone: "soul", x: 7, y: 50, size: 13, tilt: -28, pace: 8 },
  { stone: "power", x: 19, y: 68, size: 8, tilt: 20, pace: 11, far: true },
  { stone: "time", x: 28, y: 80, size: 11, tilt: -12, pace: 9.5 },
  { stone: "shield", x: 3, y: 84, size: 7, tilt: 40, pace: 10, far: true },
  { stone: "soul", x: 71, y: 5, size: 7, tilt: 30, pace: 10, far: true },
  { stone: "power", x: 89, y: 8, size: 14, tilt: 32, pace: 6.5 },
  { stone: "reality", x: 69, y: 33, size: 11, tilt: -35, pace: 8.5 },
  { stone: "mind", x: 87, y: 45, size: 12, tilt: 15, pace: 8 },
  { stone: "time", x: 76, y: 64, size: 8, tilt: -12, pace: 9.5, far: true },
  { stone: "space", x: 90, y: 76, size: 13, tilt: -22, pace: 7.5 },
  { stone: "shield", x: 68, y: 85, size: 7, tilt: 18, pace: 10.5, far: true },
];

function DriftingStones({ stones, lazy }: { stones: Stone[]; lazy?: boolean }) {
  return stones.map(({ stone, x, y, size, tilt, pace, far }, i) => (
    <span
      key={i}
      className={cn("drift absolute aspect-square overflow-hidden rounded-full shadow-lg", far && "opacity-60 blur-[1px]")}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `calc(var(--spacing) * ${size})`,
        rotate: `${tilt}deg`,
        animationDuration: `${pace}s`,
        animationDelay: `${-i * 1.7}s`,
      }}
    >
      <AssetImage src={`/assets/stones/${stone}-token.png`} alt="" lazy={lazy} />
    </span>
  ));
}

/** The welcome screen's backdrop: Thanos, with the stones adrift around him. */
export function WelcomeArt() {
  return (
    <>
      {/* Thanos, with his face and the Gauntlet kept clear of everything adrift. */}
      <span className="fade-edges absolute -top-[18%] left-[4%] aspect-[3/4] h-[125%]">
        <AssetImage src="/assets/thanos.png" alt="" sizes="50vw" preload className="object-contain" />
      </span>
      <DriftingStones stones={STONES} />
    </>
  );
}

/**
 * Thanos in the middle, over whatever is passed in, with the stones all round:
 * spread from side to side, or from top to bottom on a phone held upright.
 * It is drawn on every page but seldom shown, so its pictures wait until it is.
 */
export function StackedArt({ upright, children }: { upright?: boolean; children: React.ReactNode }) {
  return (
    <>
      <DriftingStones stones={upright ? STONES_UPRIGHT : STONES_WIDE} lazy />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* On its side there is no room to spare, so the empty sky above his head runs off the top. */}
        <span className={cn("fade-edges relative aspect-[3/4]", upright ? "w-140" : "-mt-16 h-86")}>
          <AssetImage
            src="/assets/thanos.png"
            alt=""
            sizes={upright ? "70vw" : "40vw"}
            lazy
            className="object-contain"
          />
        </span>
        {/* Drawn up over where Thanos fades out. */}
        <div className="relative -mt-16">{children}</div>
      </div>
    </>
  );
}

// The gems round the two cards: where each sits, as shares of the picture, how big, and in front or behind.
const GEM_CLOUD = [
  { stone: "space", left: 12, top: 16, size: "size-10", front: false },
  { stone: "mind", left: 32, top: 8, size: "size-7", front: false },
  { stone: "reality", left: 88, top: 14, size: "size-11", front: false },
  { stone: "time", left: 70, top: 6, size: "size-7", front: false },
  { stone: "soul", left: 8, top: 58, size: "size-8", front: true },
  { stone: "power", left: 92, top: 52, size: "size-9", front: true },
  { stone: "time", left: 22, top: 84, size: "size-11", front: true },
  { stone: "space", left: 80, top: 84, size: "size-8", front: true },
  { stone: "mind", left: 50, top: 90, size: "size-7", front: true },
];

/** Two at the table: Thor and Loki head to head, in a cloud of gems kept inside the picture. */
export function DuelArt() {
  return (
    <span className="absolute inset-0 flex items-start justify-center gap-3 overflow-hidden rounded-t-3xl pt-4">
      {GEM_CLOUD.map(({ stone, left, top, size, front }, i) => (
        <Piece
          key={i}
          src={`/assets/stones/${stone}-token.png`}
          className={cn(size, "-translate-1/2 rounded-full ring-2 ring-white/60", front ? "z-10" : "opacity-80")}
          style={{ left: `${left}%`, top: `${top}%` }}
        />
      ))}
      <Piece src="/cards/thor.png" className={cn(CARD, "relative top-3 rotate-12")} />
      <Piece src="/cards/loki.png" className={cn(CARD, "relative top-3 -rotate-12")} />
    </span>
  );
}
