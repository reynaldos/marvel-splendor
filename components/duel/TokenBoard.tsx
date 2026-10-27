"use client";

import { useState } from "react";
import { cn } from "cn";
import { Equal, Maximize2, PaperBag, ScrollText } from "lucide-react";

import { ASSETS, AssetImage, AvengersIcon } from "@/components/game/assets";
import { tokenMeta } from "@/components/game/stone-colors";
import { TokenChip } from "@/components/game/TokenChip";
import { Zoomable } from "@/components/game/Zoomable";
import { GRID, spaceAt, SPIRAL } from "@/lib/duel/board";
import { STONES, type TokenColor } from "@/lib/duel/types";

/** For each space, which way the printed path comes in and goes out. */
const PATH = SPIRAL.map(([x, y], i) => {
  const prev = SPIRAL[i - 1];
  const next = SPIRAL[i + 1];
  return { from: prev ? [prev[0] - x, prev[1] - y] : null, to: next ? [next[0] - x, next[1] - y] : null };
});

/** The look of the printed path, in a 24 by 24 space. Change these to tune it. */
const PATH_STYLE = {
  /** The line's color, a Tailwind text class. */
  color: "text-cosmos-300",
  /** The line's thickness. */
  stroke: 0.75,
  /** How far the line reaches toward each edge, from 0 (the middle) to 12 (the edge). */
  reach: 12,
  /** The arrowhead's length, from its tip to its base, and its width across the base. */
  headLength: 5.5,
  headWidth: 6,
  /** Where the arrowhead's tip sits along the way out, from the middle: 0 puts the head over the middle. */
  headOffset: 3.5,
  /** The last space's end mark: how far it runs from the middle, and its dash pattern. */
  endReach: 10,
  endDash: "1.5 1.5",
};

/** The printed path through one empty space: one line in and out through the middle, the arrowhead pointing on. */
function PathMark({ space }: { space: number }) {
  const p = PATH[space];
  const { stroke, reach, headLength, headWidth, headOffset, endReach, endDash } = PATH_STYLE;
  const edge = (d: number[]) => `${12 + d[0] * reach},${12 + d[1] * reach}`;
  const points = [p.from && edge(p.from), "12,12", p.to && edge(p.to)].filter(Boolean).join(" ");
  const head = (d: number[]) => {
    const [px, py] = [-d[1], d[0]];
    const [tx, ty] = [12 + d[0] * headOffset, 12 + d[1] * headOffset];
    const [bx, by] = [tx - d[0] * headLength, ty - d[1] * headLength];
    const half = headWidth / 2;
    return `${tx},${ty} ${bx + px * half},${by + py * half} ${bx - px * half},${by - py * half}`;
  };
  return (
    <svg viewBox="0 0 24 24" className={cn("absolute inset-0 size-full", PATH_STYLE.color)} aria-hidden>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      {p.to ? (
        <polygon points={head(p.to)} fill="currentColor" />
      ) : (
        <line x1={12} y1={12} x2={12} y2={12 + endReach} stroke="currentColor" strokeWidth={stroke} strokeDasharray={endDash} />
      )}
    </svg>
  );
}

interface GridProps {
  board: readonly (TokenColor | null)[];
  size: "sm" | "lg";
  /** Spaces picked so far, outlined in gold. */
  selected?: readonly number[];
  /** Spaces another player just took, outlined as a trace. */
  traced?: readonly number[];
  /** Tapping a space with a token; left out, the grid only shows. */
  onTap?: (space: number) => void;
  /** With `onTap`, which spaces may be tapped; the rest are dimmed. */
  canTap?: (space: number) => boolean;
  /** Stones land as they arrive: on the board itself, not in a popup opened later. */
  land?: boolean;
}

/**
 * The 5 by 5 board, read in grid order from the spiral; the middle space tinted, the path through the empty ones.
 * A stone that was not there on the last draw lands: it is keyed by how many times its space has been filled, so
 * it is drawn afresh and plays its landing, in the order the bag fills the board.
 */
export function Grid({ board, size, selected = [], traced = [], onTap, canTap, land }: GridProps) {
  const cells = Array.from({ length: GRID * GRID }, (_, i) => spaceAt(i % GRID, Math.floor(i / GRID)));
  // Without `land`, the stones already there count as seen, so nothing lands on opening.
  const [seen, setSeen] = useState({ board: land ? ([] as readonly (TokenColor | null)[]) : board, fills: Array<number>(GRID * GRID).fill(0) });
  let fills = seen.fills;
  if (seen.board !== board) {
    fills = fills.map((n, space) => (board[space] && seen.board[space] !== board[space] ? n + 1 : n));
    setSeen({ board, fills });
  }
  return (
    <div className={cn("grid grid-cols-5", size === "sm" ? "gap-1" : "gap-1.5")}>
      {cells.map((space) => {
        const token = board[space];
        const tappable = Boolean(onTap && token && (canTap?.(space) ?? true));
        const shell = cn(
          "relative flex items-center justify-center rounded-md ring-1 ring-inset ring-foreground/10",
          space === 0 ? "bg-gold-600/30" : "bg-cosmos-900/80",
          size === "sm" ? "size-8" : "size-11",
          selected.includes(space) && "ring-2 ring-gold-400",
          traced.includes(space) && "trace",
          onTap && token && !tappable && "opacity-40",
        );
        const inner = (
          <>
            {!token ? <PathMark space={space} /> : null}
            {token ? (
              <span key={fills[space]} className={cn("flex", fills[space] > 0 && "duel-land")} style={{ animationDelay: `${space * 40}ms` }}>
                <TokenChip color={token} size={size === "sm" ? "default" : "lg"} />
              </span>
            ) : null}
          </>
        );
        // A stone's cell keeps its element as turns and picks change, or it would remount and land again.
        return token ? (
          <button key={space} type="button" disabled={!tappable} onClick={() => onTap?.(space)} className={cn(shell, "disabled:cursor-default", tappable && "hover:ring-2 hover:ring-gold-200")} aria-label={`${tokenMeta(token).label} token`}>
            {inner}
          </button>
        ) : (
          <span key={space} className={shell}>
            {inner}
          </span>
        );
      })}
    </div>
  );
}

/** One of the board's reminders: do this, and your opponent gets a Privilege. With `label`, it says so in words. */
function Hint({ children, title, label }: { children: React.ReactNode; title: string; label?: string }) {
  return (
    <span className={cn("flex h-6 items-center justify-between gap-1 rounded-md bg-cosmos-950/70 px-1.5 ring-1 ring-foreground/10", label && "h-8 gap-2 px-2")} title={title}>
      <span className={cn("flex justify-center", label ? "w-10 shrink-0" : "mx-auto w-full")}>{children}</span>
      {label ? <span className="flex-1 fs-2xs font-bold text-cosmos-100">{label}</span> : null}
      <span className="ml-auto fs-3xs text-cosmos-300">▸</span>
      <ScrollText className="size-3.5 text-gold-400" />
    </span>
  );
}

const HINTS = [
  {
    title: "Take 2 Time Stones",
    icon: (
      <>
        <TokenChip color="time" size="sm" />
        <TokenChip color="time" size="sm" className="-ml-2.5" />
      </>
    ),
  },
  { title: "Refill the board", icon: <PaperBag className="size-4 text-cosmos-100" /> },
  {
    title: "Take 3 of one color",
    icon: (
      <span className="flex items-center">
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn("flex size-5 items-center justify-center rounded-full bg-cosmos-700 text-cosmos-100 ring-1 ring-cosmos-300", i > 0 && "-ml-1.5")}>
            <Equal className="size-3" />
          </span>
        ))}
      </span>
    ),
  },
];

/** The board's three reminders of what hands the opponent a Privilege; `labeled` spells each out, with a heading. */
export function Reminders({ className, labeled }: { className?: string; labeled?: boolean }) {
  return (
    <span className={cn("flex gap-1.5", className)}>
      {labeled ? <span className="mb-1 fs-2xs font-bold tracking-wide text-gold-400 uppercase">Your rival gets a Privilege when you</span> : null}
      {HINTS.map(({ title, icon }) => (
        <Hint key={title} title={`${title}: your opponent gets a Privilege`} label={labeled ? title : undefined}>
          {icon}
        </Hint>
      ))}
    </span>
  );
}

interface TokenBoardProps extends Omit<GridProps, "size"> {
  bagCount: number;
  /** Set when the player may refill now: the bag badge becomes the button for it. */
  onRefill?: () => void;
  /** What the large view says it is for. */
  title?: string;
}

/** The board compact in the column, where lines are picked, and large from the corner button; the bag count on the other corner. */
export function TokenBoard({ bagCount, onRefill, title = "Take up to 3 stones in a line", ...grid }: TokenBoardProps) {
  return (
    <div className="relative mx-auto rounded-lg bg-cosmos-950/60 p-1.5 ring-1 ring-foreground/10">
      <Grid {...grid} size="sm" land />
      <Zoomable
        label="Show the stone board large"
        title={title}
        interactive
        className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-1 ring-gold-400/60 hover:bg-cosmos-500"
        zoomed={
          <div className="flex items-start gap-5 rounded-2xl bg-cosmos-950/90 p-4 ring-2 ring-gold-400">
            <Grid {...grid} size="lg" />
            <Reminders className="my-auto w-56 flex-col" labeled />
          </div>
        }
      >
        <Maximize2 className="size-3" />
      </Zoomable>
      {onRefill ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRefill();
          }}
          className="absolute -top-2 -left-2 flex h-5 items-center gap-1 rounded-full bg-gold-400 px-1.5 fs-3xs font-black text-cosmos-950 ring-1 ring-gold-200 hover:bg-gold-200"
          title="Refill the board from the bag: your opponent gets a Privilege"
        >
          <PaperBag className="size-3" /> Refill {bagCount}
        </button>
      ) : (
        <span className="absolute -top-2 -left-2 flex h-5 items-center gap-1 rounded-full bg-cosmos-700 px-1.5 fs-3xs font-black text-gold-200 ring-1 ring-gold-400/60" title="Stones in the bag">
          <PaperBag className="size-3" /> {bagCount}
        </span>
      )}
    </div>
  );
}

/** The win tile, with Duel's three conditions on a panel over its printed strip: any one of them wins at once. Off the board, `still` keeps it from opening large. */
export function WinTile({ still }: { still?: boolean }) {
  const image = ASSETS.winTile?.image;
  const face = (
    <>
      {image ? <AssetImage src={image} alt="How to win" sizes="12vw" /> : null}
      <WinPanel />
    </>
  );
  if (still) return <span className="@container relative mx-auto block aspect-[1404/670] w-36 overflow-hidden rounded-md ring-1 ring-foreground/10">{face}</span>;
  return (
    <Zoomable
      label="Show how to win"
      title="Any one of these wins, with a card of every color"
      className="@container relative mx-auto aspect-[1404/670] w-36 overflow-hidden rounded-md ring-1 ring-foreground/10"
      zoomed={
        <div className="@container relative aspect-[1404/670] w-150 overflow-hidden rounded-xl">
          {image ? <AssetImage src={image} alt="" sizes="75vw" /> : null}
          <WinPanel />
        </div>
      }
    >
      {face}
    </Zoomable>
  );
}

function WinPanel() {
  const row = "flex items-center gap-[2cqw] font-display text-[length:7.5cqw] leading-none font-black text-white [-webkit-text-stroke:1px_black] [paint-order:stroke_fill]";
  return (
    <span className="absolute inset-y-0 left-0 flex w-[30cqw] flex-col items-center justify-center gap-[3.5cqw] bg-cosmos-950">
      <span className={row} title="20 points">
        20<span className="text-[length:4cqw] text-gold-200">PTS</span>
      </span>
      <span className={row} title="10 Avengers badges">
        10<AvengersIcon className="size-[8cqw]" />
      </span>
      <span className={row} title="10 points on cards of one color">
        10
        <span className="relative size-[11cqw]">
          {STONES.map((st, i) => {
            const angle = -Math.PI / 2 + (i * 2 * Math.PI) / STONES.length;
            return (
              <span
                key={st}
                className={cn("absolute size-[3.5cqw] -translate-x-1/2 -translate-y-1/2 rounded-full", tokenMeta(st).swatch)}
                style={{ left: `${50 + 40 * Math.cos(angle)}%`, top: `${50 + 40 * Math.sin(angle)}%` }}
              />
            );
          })}
        </span>
      </span>
      {/* And a card of every color, whichever win it is. */}
      <span className="flex items-center gap-[1cqw]" title="With a card of every color">
        <span className="font-display text-[length:5cqw] leading-none font-black text-gold-200">+</span>
        {STONES.map((st) => (
          <span key={st} className={cn("size-[3.5cqw] rounded-full", tokenMeta(st).swatch)} />
        ))}
      </span>
    </span>
  );
}

/** A Privilege scroll: bright on the table, dim with its holder's name once taken; tappable when it is yours to spend. */
export function Privilege({ takenBy, onSpend }: { takenBy?: string; onSpend?: () => void }) {
  const chip = cn(
    "flex size-7 items-center justify-center rounded-full ring-2 ring-inset",
    takenBy ? "bg-cosmos-950 text-cosmos-500 ring-cosmos-700" : "bg-gold-400 text-cosmos-950 ring-gold-200",
    onSpend && "bg-gold-400 text-cosmos-950 ring-gold-200 hover:bg-gold-200",
  );
  return (
    <span className="flex flex-col items-center gap-0.5">
      {onSpend ? (
        <button type="button" onClick={onSpend} className={chip} title="Spend this Privilege: take any one stone">
          <ScrollText className="size-4" />
        </button>
      ) : (
        <span className={chip} title={takenBy ? `Held by ${takenBy}` : "On the table"}>
          <ScrollText className="size-4" />
        </span>
      )}
      <span className="h-3 fs-3xs font-bold text-cosmos-300">{takenBy ?? ""}</span>
    </span>
  );
}

/** The Privileges a player holds, on their name tab beside their Avengers count. */
export function HeldScrolls({ count }: { count: number }) {
  return (
    <span className="ml-1.5 flex items-center gap-0.5 fs-2xs font-bold" title="Privileges held">
      <ScrollText className="size-3.5 text-gold-400" />
      {count}
    </span>
  );
}
