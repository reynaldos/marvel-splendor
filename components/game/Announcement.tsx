"use client";

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";

import { ASSETS, AssetImage, AvengersIcon } from "@/components/game/assets";
import { LocationTile } from "@/components/game/LocationTile";
import type { BoardEvent } from "@/lib/board-events";
import { getLocation } from "@/lib/engine/data";

/** How long a tile takes to travel from the board to the middle of the screen. */
const GLIDE_MS = 900;
/** How long an announcement holds the screen. The Eye takes its time to open. */
export function announceMs(event: BoardEvent): number {
  return event.kind === "timeStone" ? 6500 : 3000;
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
      <div style={length} className="announce-dim absolute inset-0 bg-black/70" />
      {event.kind === "timeStone" ? <div className="eye-flash absolute inset-0 bg-green-400" /> : null}
      <div style={length} className="announce-hold absolute inset-0 flex flex-col items-center justify-center gap-3">
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
 * The Eye of Agamotto. The rings of its cage turn, slowly and each in its own
 * time, until two bars lie along the top of the opening and two along the
 * bottom, like the lids of an eye, as the gold sphere behind them splits along a slit and its halves
 * part all the way. Only then does the green light come up.
 */
function Eye() {
  return (
    <div className="relative aspect-square">
      <span className="eye-glow absolute -inset-[20%] rounded-full bg-green-400/60 blur-2xl" />
      <span className="absolute inset-0 rounded-full bg-conic from-gold-600 via-gold-200 to-gold-600 shadow-2xl" />
      <div className="absolute inset-[8%] overflow-hidden rounded-full bg-cosmos-950 shadow-[inset_0_0_1rem_black]">
        <span className="eye-glow absolute inset-0 bg-radial from-green-300/80 to-green-900/40" />
        <div
          className="absolute inset-[30%] overflow-hidden rounded-full shadow-[0_0_0.5rem_black]"
          style={{ rotate: `${LEAN}deg` }}
        >
          <span className="absolute inset-0" style={{ rotate: `${-LEAN}deg` }}>
            {ASSETS.tokens.time ? <AssetImage src={ASSETS.tokens.time} alt="" sizes="15vw" /> : null}
          </span>
          <span className="eye-glow absolute inset-0 bg-radial from-white/80 via-green-300/50 to-transparent" />
          <span className="eye-lid eye-lid-top absolute inset-x-0 top-0 h-1/2 border-b border-black/60 bg-linear-to-b from-gold-200 to-gold-600" />
          <span className="eye-lid eye-lid-bottom absolute inset-x-0 bottom-0 h-1/2 border-t border-black/60 bg-linear-to-t from-gold-400 to-gold-600" />
        </div>
        {RINGS.map((ring) => (
          <svg
            key={ring.name}
            viewBox="0 0 100 100"
            className="eye-ring absolute inset-0 size-full drop-shadow-[0_0.1rem_0.15rem_black]"
            style={
              {
                "--from": `${ring.from}deg`,
                "--to": `${ring.to}deg`,
                animationDuration: `${ring.time}s`,
              } as CSSProperties
            }
          >
            <circle cx="50" cy="50" r={ring.ring} fill="none" stroke={ring.name} strokeWidth="1.4" />
            <path d={bar(ring)} fill={ring.name} stroke="#1e293b" strokeWidth="0.8" strokeLinejoin="round" />
          </svg>
        ))}
      </div>
    </div>
  );
}
