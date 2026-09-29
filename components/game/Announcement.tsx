"use client";

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";

import { cn } from "cn";

import { ASSETS, AssetImage, AvengersIcon } from "@/components/game/assets";
import { LocationTile } from "@/components/game/LocationTile";
import type { BoardEvent } from "@/lib/board-events";
import { getLocation } from "@/lib/engine/data";

/** How long a tile takes to travel from the board to the middle of the screen. */
const GLIDE_MS = 900;
/** How long an announcement holds the screen. The Eye takes its time to open. */
export function announceMs(event: BoardEvent): number {
  return event.kind === "timeStone" ? 5000 : 3000;
}

/** A tile as it sat on the board: where, and a copy of it to carry to the middle of the screen. */
export interface TileOrigin {
  rect: DOMRect;
  copy: HTMLElement;
}

/** Read before the board changes, while the tile is still on it. */
export function tileOrigin(event: BoardEvent): TileOrigin | null {
  if (event.kind === "timeStone") return null;
  const tile = document.querySelector<HTMLElement>(`[data-tile="${event.kind === "avengers" ? "avengers" : event.locationId}"]`);
  if (!tile) return null;
  const copy = tile.cloneNode(true) as HTMLElement;
  copy.removeAttribute("data-tile");
  // Who held the Avengers tile before is no longer true.
  copy.querySelector("[data-caption]")?.remove();
  copy.style.boxShadow = "0 0 0 calc(var(--spacing) * 0.5) var(--color-gold-400), 0 1.5rem 3rem rgb(0 0 0 / 0.6)";
  return { rect: tile.getBoundingClientRect(), copy };
}

interface AnnouncementProps {
  event: BoardEvent;
  origin: TileOrigin | null;
  nameForSeat: (seat: number) => string;
}

/**
 * Stops the game for a moment to show everyone what just happened: a Location
 * or the Avengers tile glides from its place on the board to the middle of
 * the screen, or the Eye of Agamotto opens on the Time Stone.
 */
export function Announcement({ event, origin, nameForSeat }: AnnouncementProps) {
  const name = nameForSeat(event.seat);
  // The Eye goes as its light does, rather than holding and then going.
  const eye = event.kind === "timeStone";
  const length = { animationDuration: `${announceMs(event)}ms` };

  let piece: ReactNode;
  let line: string;
  let detail: string | null = null;
  if (event.kind === "location") {
    const location = getLocation(event.locationId);
    piece = <LocationTile location={location} className="rounded-3xl shadow-2xl ring-2 ring-gold-400" />;
    line = `${name} created a base in ${location.name}`;
  } else if (event.kind === "avengers") {
    piece = (
      <span className="relative block aspect-square overflow-hidden rounded-3xl bg-cosmos-800 shadow-2xl ring-2 ring-gold-400">
        {ASSETS.avengersTile ? (
          <AssetImage src={ASSETS.avengersTile} alt="" sizes="25vw" />
        ) : (
          <AvengersIcon className="absolute inset-0 m-auto size-2/3 text-6xl" />
        )}
      </span>
    );
    line = `${name} assembled the Avengers`;
    if (event.from !== null) detail = `Taken from ${nameForSeat(event.from)}`;
  } else {
    piece = <Eye />;
    line = `${name} has acquired the Time Stone`;
  }

  return (
    <div role="status" className="pointer-events-none absolute inset-0 z-40">
      <div style={length} className={cn("announce-dim absolute inset-0 bg-black/70", eye && "announce-eye")} />
      <div
        style={length}
        className={cn("announce-hold absolute inset-0 flex flex-col items-center justify-center gap-3", eye && "announce-eye")}
      >
        <Glide origin={origin}>{piece}</Glide>
        <p className="announce-line w-full bg-cosmos-950/85 py-2 text-center shadow-lg ring-2 ring-gold-400">
          <span className="font-display text-2xl font-black tracking-wide text-gold uppercase">{line}</span>
          {detail ? <span className="block text-sm font-bold text-cosmos-300">{detail}</span> : null}
        </p>
      </div>
    </div>
  );
}

/**
 * Carries a tile from its place on the board to the middle of the screen. It
 * is the very tile that was on the board, so it is on screen from the first
 * frame with nothing to load. With no tile to carry, what it is given grows
 * out of the middle instead.
 */
function Glide({ origin, children }: { origin: TileOrigin | null; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const holder = ref.current;
    if (!holder) return;
    if (origin) holder.append(origin.copy);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => origin?.copy.remove();

    const here = holder.getBoundingClientRect();
    const from = origin?.rect;
    const flight = holder.animate(
      [
        {
          transform: from
            ? `translate(${from.x + from.width / 2 - (here.x + here.width / 2)}px, ${from.y + from.height / 2 - (here.y + here.height / 2)}px) scale(${from.width / here.width})`
            : "scale(0.3)",
        },
        { transform: "none" },
      ],
      { duration: GLIDE_MS, easing: "cubic-bezier(0.3, 0, 0.2, 1)", fill: "backwards" },
    );
    return () => {
      // Taken back, so a second start measures from where the tile rests, not from mid-flight.
      flight.cancel();
      origin?.copy.remove();
    };
  }, [origin]);

  return (
    <div ref={ref} className="w-44">
      {origin ? null : children}
    </div>
  );
}

/** How far the slit in the sphere leans off level, to lie along the opening. */
const LEAN = -22;

/**
 * The cage: four rings stacked one on another, each carrying one bar across
 * it and turning about the middle of the Eye, the next the opposite way to
 * the last. Measured off frames of the real thing, where the rings were
 * marked in these colours. Listed from the bottom of the stack up, so the
 * last is drawn over the rest.
 *
 * A bar is drawn lying across the top of its ring: `ends` and `middle` are how
 * far it is from the middle of the Eye there (the rim is at 50, and a minus
 * is the far side of the middle), `thick` how thick it is at each. `from` and
 * `to` are how far round the ring is, closed and open, clockwise from there.
 */
const RINGS = [
  { name: "blue", ring: 45.8, ends: 35.5, middle: 26, thick: [10, 3], from: -10, to: 175, time: 4.5 },
  { name: "yellow", ring: 46.8, ends: -0, middle:12, thick: [10, 3], from: 105, to: -20, time: 4.1 },
  { name: "purple", ring: 47.8, ends: 18, middle: 13.5, thick: [10, 5], from: -175, to:-20, time: 4.4 },
  { name: "red", ring: 49, ends: 24, middle: 17, thick: [10, 5], from: -130, to: -195, time: 4.2 },
];

// Markings cut into the metal, drawn in a box one high. Made of strokes, so no device needs a font for them.
const RUNES = [
  "M-0.2 0.5V-0.5M-0.2 -0.2L0.25 -0.5M-0.2 0.1L0.25 -0.2",
  "M-0.25 0.5V-0.5L0.25 -0.1V0.5",
  "M-0.2 0.5V-0.5M-0.2 -0.25L0.2 0L-0.2 0.25",
  "M-0.2 0.5V-0.5L0.2 -0.25L-0.2 0L0.25 0.5",
  "M0.2 -0.4L-0.2 0L0.2 0.4",
  "M0 0.5V-0.5M-0.3 -0.5L0 -0.1L0.3 -0.5",
  "M0 0.5V-0.5M-0.3 -0.2L0 -0.5L0.3 -0.2",
  "M-0.3 0.5L0.3 -0.1L0 -0.5L-0.3 -0.1L0.3 0.5",
];

/** Markings set round part of a circle, each standing on it, from one angle to another (0 is the top). */
function runesRound(radius: number, count: number, size: number, from = 0, to = 360) {
  return Array.from({ length: count }, (_, i) => (
    <path
      key={i}
      d={RUNES[(i * 3 + Math.round(from)) % RUNES.length]}
      transform={`rotate(${from + ((to - from) / count) * (i + 0.5)} 50 50) translate(50 ${50 - radius}) scale(${size})`}
    />
  ));
}

/** A wheel out of a clock: teeth round its rim and spokes. `turn` is seconds a turn, the other way when negative. */
function Gear({ at, r, spokes, turn }: { at: number; r: number; spokes: number; turn: number }) {
  // A tooth and a gap are as wide as each other, and a whole number of them go round.
  const tooth = (Math.PI * r) / Math.round((Math.PI * r) / 0.9);
  return (
    // Set on the ring that covers its middle, `at` degrees round from the top.
    <g transform={`rotate(${at} 50 50) translate(50 ${50 - GEARS_AT})`}>
      <g
        className="eye-gear"
        style={{ animationDuration: `${Math.abs(turn)}s`, animationDirection: turn < 0 ? "reverse" : "normal" }}
      >
        <circle r={r} strokeWidth="1.3" strokeDasharray={`${tooth} ${tooth}`} />
        <circle r={r - 1.1} strokeWidth="0.6" />
        {Array.from({ length: spokes }, (_, i) => (
          <path key={i} d={`M0 0V${-r + 1.1}`} strokeWidth="0.8" transform={`rotate(${(360 / spokes) * i})`} />
        ))}
      </g>
    </g>
  );
}

/** How far from the middle of the Eye the wheels sit, under the ring that covers their middles. */
const GEARS_AT = 31;
// Round the ring, each turning against its neighbours.
const GEARS = [
  { at: 12, r: 8.5, spokes: 5, turn: 14 },
  { at: 58, r: 6.5, spokes: 4, turn: -10 },
  { at: 101, r: 8, spokes: 5, turn: 13 },
  { at: 147, r: 6, spokes: 4, turn: -9 },
  { at: 190, r: 8.5, spokes: 6, turn: 15 },
  { at: 236, r: 6.5, spokes: 4, turn: -11 },
  { at: 281, r: 8, spokes: 5, turn: 12 },
  { at: 326, r: 6, spokes: 4, turn: -9 },
];

// The casing: an eye lying on its side, wider than the ring it holds.
const CASING = "M-32 50C-12 -24 112 -24 132 50C112 124 -12 124 -32 50Z";

/** Markings set along the middle of a bar, turning with it and smaller where it is thinner. */
function runesAlong({ ring, ends, middle, thick }: (typeof RINGS)[number], first: number) {
  const reach = Math.sqrt(ring ** 2 - ends ** 2);
  const [atEnds, atMiddle] = [50 - ends, 50 - middle];
  const pull = 2 * atMiddle - atEnds;
  return Array.from({ length: 9 }, (_, i) => {
    const t = 0.14 + i * 0.09;
    const x = 50 - reach + 2 * reach * t;
    const y = (1 - t) ** 2 * atEnds + 2 * t * (1 - t) * pull + t ** 2 * atEnds;
    const slope = Math.atan2(2 * (1 - 2 * t) * (pull - atEnds), 2 * reach);
    const size = (thick[0] + (thick[1] - thick[0]) * (1 - Math.abs(2 * t - 1))) * 0.5;
    return (
      <path
        key={i}
        d={RUNES[(i * 3 + first) % RUNES.length]}
        transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${((slope * 180) / Math.PI).toFixed(1)}) scale(${size.toFixed(2)})`}
      />
    );
  });
}

// Aged brass, lit from above.
const BRASS = [
  ["0", "#fbe9a6"],
  ["0.3", "#d9a441"],
  ["0.7", "#8f5f1b"],
  ["1", "#5a390d"],
];
// The casing: the same, a shade redder and deeper.
const BRONZE = [
  ["0", "#f3d692"],
  ["0.3", "#c98d3a"],
  ["0.7", "#82501a"],
  ["1", "#4e2e0c"],
];
// The cage: silver gone a little warm with age, to sit with the brass.
const SILVER = [
  ["0", "#F4F1E677"],
  ["0.3", "#75746C"],
  ["0.7", "#8f8a78"],
  ["1", "#5c5849"],
];
const ENGRAVED = { fill: "none", stroke: "#3b2507", strokeWidth: 0.14, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** A bar's outline: two curves from rim to rim, further apart where it is thicker. */
function bar({ ring, ends, middle, thick }: (typeof RINGS)[number]): string {
  // Each bar runs from one side of its own ring to the other.
  const reach = Math.sqrt(ring ** 2 - ends ** 2) + 4;
  // A curve's middle is halfway between its ends and the point it is pulled towards.
  const edge = (side: number) => {
    const atEnds = 50 - ends + (side * thick[0]) / 2;
    const atMiddle = 50 - middle + (side * thick[1]) / 2;
    return { atEnds, pull: 2 * atMiddle - atEnds };
  };
  const [outer, inner] = [edge(-1), edge(1)];
  return (
    `M${50 - reach} ${outer.atEnds} Q50 ${outer.pull} ${50 + reach} ${outer.atEnds} ` +
    `L${50 + reach} ${inner.atEnds} Q50 ${inner.pull} ${50 - reach} ${inner.atEnds} Z`
  );
}

/**
 * The Eye of Agamotto, in aged brass cut with markings: a casing the shape
 * of an eye, a rim, and behind the cage the works of a skeleton clock. The rings of its cage
 * turn, slowly and each in its own time, until two bars lie along the top of
 * the opening and two along the bottom, like the lids of an eye, as the
 * sphere behind them splits along a slit and its halves part all the way.
 * Only then does the green light come up.
 */
function Eye() {
  return (
    <div className="relative aspect-square">
      {/* The light spreads from the stone out over the whole screen, and fades as it goes. */}
      <span
        className="eye-cast pointer-events-none absolute top-1/2 left-1/2 size-[260vmax] -translate-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, rgb(74 222 128 / 0.7), rgb(74 222 128 / 0.35) 25%, transparent 65%)" }}
      />
      {/* A box as big as the casing, with its shadow a plain one: Safari cuts off what is drawn outside
          a drawing's box, and draws a filtered drawing wrongly while it is growing. */}
      <div className="absolute -top-[8%] -left-[35%] h-[116%] w-[170%]">
      <span className="absolute inset-x-[6%] inset-y-[10%] rounded-[50%] shadow-[0_0.5rem_2rem_0.5rem_black]" />
      <svg viewBox="-35 -8 170 116" width="100%" height="100%" className="absolute inset-0 block">
        <linearGradient id="brass-casing" x1="0" y1="0" x2="0" y2="1">
          {BRONZE.map(([offset, color]) => (
            <stop key={offset} offset={offset} stopColor={color} />
          ))}
        </linearGradient>
        <clipPath id="casing">
          <path d={CASING} />
        </clipPath>
        <path d={CASING} fill="url(#brass-casing)" stroke="#2a1a05" strokeWidth="0.8" />
        <g {...ENGRAVED} clipPath="url(#casing)">
          {/* A line round the ring, a band of markings, and panels out to the points. */}
          <circle cx="50" cy="50" r="52.5" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="60" strokeWidth="0.35" />
          <path d={CASING} strokeWidth="0.5" transform="translate(50 50) scale(0.93) translate(-50 -50)" />
          {[60, 75, 90, 105, 120, 240, 255, 270, 285, 300].map((angle) => (
            <path key={angle} d="M50 -10V-40" strokeWidth="0.35" transform={`rotate(${angle} 50 50)`} />
          ))}
          <g strokeWidth="0.16">
            {runesRound(56.2, 14, 3.4, 48, 132)}
            {runesRound(56.2, 14, 3.4, 228, 312)}
            {runesRound(66, 8, 3, 64, 116)}
            {runesRound(66, 8, 3, 244, 296)}
          </g>
        </g>
      </svg>
      </div>
      {/* The rim the cage sits in. */}
      <span className="absolute inset-[4%] rounded-full bg-conic from-gold-600 via-gold-200 to-gold-600 shadow-[0_0_0.4rem_black]" />
      <div
        className="absolute inset-[8%] overflow-hidden rounded-full shadow-[inset_0_0_1rem_black]"
        // The plate behind the cage: dark brass, brighter towards the middle.
        style={{ background: "radial-gradient(circle, #7a5218 0%, #4a300c 45%, #211403 100%)" }}
      >
        {/* The works of a skeleton clock: small dark wheels turning under a brass ring, inside a band of small markings. */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" fill="none">
          <linearGradient id="brass-plate" x1="0" y1="0" x2="0" y2="1">
            {BRASS.map(([offset, color]) => (
              <stop key={offset} offset={offset} stopColor={color} />
            ))}
          </linearGradient>
          <g stroke="#6b4713">
            {GEARS.map((gear) => (
              <Gear key={gear.at} {...gear} />
            ))}
          </g>
          <circle cx="50" cy="50" r={GEARS_AT} stroke="#2a1a05" strokeWidth="5.4" />
          <circle cx="50" cy="50" r={GEARS_AT} stroke="url(#brass-plate)" strokeWidth="4.4" />
          <g stroke="#a87a2a">
            <circle cx="50" cy="50" r="46.5" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="41" strokeWidth="0.5" />
            <g strokeWidth="0.15" strokeLinecap="round" strokeLinejoin="round">
              {runesRound(43.8, 40, 3)}
            </g>
          </g>
        </svg>
        <span className="eye-glow absolute inset-0 bg-radial from-green-300/80 to-green-900/40" />
        <div
          className="absolute inset-[30%] overflow-hidden rounded-full"
          style={{ rotate: `${LEAN}deg` }}
        >
          <span className="absolute inset-0" style={{ rotate: `${-LEAN}deg` }}>
            {ASSETS.tokens.time ? <AssetImage src={ASSETS.tokens.time} alt="" sizes="15vw" /> : null}
          </span>
          <span className="eye-glow absolute inset-0 bg-radial from-white/80 via-green-300/50 to-transparent" />
          <span className="eye-lid eye-lid-top absolute inset-x-0 top-0 h-1/2 border-b border-black/60 bg-linear-to-b from-gold-200 via-gold-400 to-gold-600" />
          <span className="eye-lid eye-lid-bottom absolute inset-x-0 bottom-0 h-1/2 border-t border-black/60 bg-linear-to-t from-gold-600 via-gold-600 to-gold-400" />
        </div>
        {RINGS.map((ring, i) => (
          <svg
            key={ring.name}
            viewBox="0 0 100 100"
            className="eye-ring absolute inset-0 size-full"
            style={
              {
                "--from": `${ring.from}deg`,
                "--to": `${ring.to}deg`,
                animationDuration: `${ring.time}s`,
              } as CSSProperties
            }
          >
            <linearGradient id={`silver-${ring.name}`} x1="0" y1="0" x2="0" y2="1">
              {SILVER.map(([offset, color]) => (
                <stop key={offset} offset={offset} stopColor={color} />
              ))}
            </linearGradient>
            <circle cx="50" cy="50" r={ring.ring} fill="none" stroke="#a8a390" strokeWidth="1.4" />
            <path d={bar(ring)} fill={`url(#silver-${ring.name})`} stroke="#2b2a22" strokeWidth="0.7" strokeLinejoin="round" />
            <g {...ENGRAVED} stroke="#3a382e">{runesAlong(ring, i * 2)}</g>
          </svg>
        ))}
      </div>
    </div>
  );
}
