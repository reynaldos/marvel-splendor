"use client";

import { useState, type ReactNode } from "react";
import { cn } from "cn";
import { Copy, Equal, Grape, HandCoins, PaperBag, Repeat, ScrollText, Shuffle } from "lucide-react";

import { ASSETS, AssetImage, AvengersIcon } from "@/components/game/assets";
import { CardView } from "@/components/game/Card";
import { EndTurnBar } from "@/components/game/EndTurnBar";
import { HandTray } from "@/components/game/HandTray";
import { PlayerPlaque } from "@/components/game/PlayerPlaque";
import { TokenChip } from "@/components/game/TokenChip";
import { Zoomable } from "@/components/game/Zoomable";
import duelCards from "@/data/duel/cards.json";
import duelRoyals from "@/data/duel/royals.json";
import { tokenMeta } from "@/components/game/stone-colors";
import { ALL_CARDS, ALL_LOCATIONS } from "@/lib/engine/data";
import { createRng, shuffle } from "@/lib/engine/rng";
import { emptyStones, emptyTokens, STONES, TOKEN_COLORS, type Card, type Stone, type TokenColor } from "@/lib/engine/types";
import type { RedactedPlayerState } from "@/lib/game-view";

/**
 * How a Duel table could look, made up: the two players, the pyramid of the box's Duel cards drawn over Marvel pictures,
 * the Privileges, the Royal cards, and the 5 by 5 token grid, compact in the side column and large on a tap.
 * Icons stand in for the pieces that have no art yet. Nothing here plays.
 */

/** Duel's abilities, with an icon each until there is art. */
const ABILITIES = {
  again: { icon: Repeat, label: "Take another turn" },
  // The many-gem cluster of the rulebook; GraphStar once lucide is newer than 1.48.
  wild: { icon: Grape, label: "Wild: joins a color you own" },
  token: { icon: Copy, label: "Take a token of this color" },
  privilege: { icon: ScrollText, label: "Take a Privilege" },
  steal: { icon: HandCoins, label: "Take a token from your opponent" },
} as const;
type Ability = keyof typeof ABILITIES;

/** A Duel card as the data has it: the box's numbers, drawn over a Marvel picture. */
interface DuelCard {
  id: string;
  level: 1 | 2 | 3;
  points: number;
  crowns: number;
  /** A stone, "wild" for the many-gem bonus that joins a color you own, or null for no bonus. */
  bonus: Stone | "wild" | null;
  bonusCount: number;
  ability: Ability | null;
  cost: Partial<Record<TokenColor, number>>;
}
const DUEL_CARDS = (duelCards as { cards: DuelCard[] }).cards;
const ROYALS = (duelRoyals as { royals: { id: string; points: number; ability: Ability | null }[] }).royals;
/** Four Location tiles with art stand in for the Royal cards' pictures. */
const ROYAL_TILES = ALL_LOCATIONS.filter((l): l is typeof l & { image: string } => Boolean(l.image)).slice(4, 8);

/** The pyramid: 3, 4 and 5 Duel cards by level, dealt the same way every load, each with a Marvel picture of its level and color. */
function dealPyramid(): { card: DuelCard; art: Card }[][] {
  const rng = createRng("duel-preview");
  const used = new Set<string>();
  // A picture of the card's level and color, with Avengers marks only when the card has crowns, and no more
  // printed costs than the card has, so the overlay covers them with no empty bar. The cost rule gives way
  // when nothing fits, as with the crowned one-cost cards.
  const artFor = (card: DuelCard) => {
    const printedCosts = (c: Card) => STONES.filter((s) => (c.cost[s] ?? 0) > 0).length;
    const base = ALL_CARDS.filter(
      (c) =>
        c.image &&
        c.level === card.level &&
        !used.has(c.id) &&
        (card.bonus === "wild" || card.bonus === null || c.bonus === card.bonus) &&
        c.tags > 0 === card.crowns > 0,
    );
    const snug = base.filter((c) => printedCosts(c) <= Object.keys(card.cost).length);
    const art = shuffle(snug.length ? snug : base, rng)[0];
    used.add(art.id);
    return art;
  };
  const row = (level: 1 | 2 | 3, n: number) =>
    shuffle(DUEL_CARDS.filter((c) => c.level === level), rng)
      .slice(0, n)
      .map((card) => ({ card, art: artFor(card) }));
  return [row(3, 3), row(2, 4), row(1, 5)];
}

/** The 25 board spaces in the order the bag fills them, as the board prints it: from the middle, down, then round anticlockwise and out to the bottom right. */
function spiral(): [number, number][] {
  const out: [number, number][] = [[2, 2]];
  let [x, y] = [2, 2];
  const dirs: [number, number][] = [[0, 1], [-1, 0], [0, -1], [1, 0]];
  for (let step = 1, d = 0; out.length < 25; step++) {
    for (let k = 0; k < 2 && out.length < 25; k++, d++) {
      for (let i = 0; i < step && out.length < 25; i++) {
        x += dirs[d % 4][0];
        y += dirs[d % 4][1];
        out.push([x, y]);
      }
    }
  }
  return out;
}

const ORDER = spiral();
/** For each space, which way the path comes in and goes out, as the board prints it. */
const PATH = ORDER.map(([x, y], i) => {
  const prev = ORDER[i - 1];
  const next = ORDER[i + 1];
  return { key: `${x},${y}`, from: prev ? [prev[0] - x, prev[1] - y] : null, to: next ? [next[0] - x, next[1] - y] : null };
});
const PATH_BY_KEY = new Map(PATH.map((p) => [p.key, p]));

/** The look of the printed path, in a 24 by 24 space. Change these to tune it. */
const PATH_STYLE = {
  /** The line's color, a Tailwind text class. */
  color: "text-cosmos-300",
  /** The line's thickness. */
  stroke: .75,
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

/** The printed path through one space: one line in and out through the middle, the arrowhead in the middle pointing on. */
function PathMark({ cellKey }: { cellKey: string }) {
  const p = PATH_BY_KEY.get(cellKey);
  if (!p) return null;
  const { stroke, reach, headLength, headWidth, headOffset, endReach, endDash } = PATH_STYLE;
  const edge = (d: number[]) => `${12 + d[0] * reach},${12 + d[1] * reach}`;
  const points = [p.from && edge(p.from), "12,12", p.to && edge(p.to)].filter(Boolean).join(" ");
  // The head: a triangle whose tip is `headOffset` along the way out, its base behind it.
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

/** The 25 tokens, Pearls as Time stones and Gold as S.H.I.E.L.D., shuffled onto the spiral with a few spaces already taken. */
function dealGrid(): (TokenColor | null)[][] {
  const rng = createRng("duel-preview-grid");
  const bag: TokenColor[] = [...STONES.flatMap((s) => [s, s, s, s]), "time", "time", "shield", "shield", "shield"];
  const grid: (TokenColor | null)[][] = Array.from({ length: 5 }, () => Array(5).fill(null));
  shuffle(bag, rng).forEach((t, i) => {
    const [x, y] = ORDER[i];
    grid[y][x] = t;
  });
  // A line of three gone from the top, and the middle spaces taken by refills not yet made.
  grid[0][1] = grid[0][2] = grid[0][3] = null;
  for (const [x, y] of ORDER.slice(0, 4)) grid[y][x] = null;
  return grid;
}

/** The three spaces of a staged line, on the diagonal. */
const STAGED = new Set(["2,2", "3,3", "4,4"]);

function player(seat: number, over: Partial<RedactedPlayerState>): RedactedPlayerState {
  return { seat, tokens: emptyTokens(), cards: [], reserved: [], locations: [], bonuses: emptyStones(), tags: 0, points: 0, away: false, ...over };
}

/**
 * A Duel card drawn over a Marvel picture: the band of its bonus color over the printed one, with the points,
 * the Avengers marks and the ability on it, and its costs over the printed ones at the bottom left.
 */
function DuelCardView({ card, art, className }: { card: DuelCard; art: Card; className?: string }) {
  const Icon = card.ability ? ABILITIES[card.ability].icon : null;
  const band = `/assets/duel/band-${card.bonus ?? "none"}.png`;
  const costs = TOKEN_COLORS.filter((t) => (card.cost[t] ?? 0) > 0);
  // The column is as tall as the longer of the two cost lists, so the printed costs are always covered.
  const rows = Math.max(costs.length, STONES.filter((s) => (art.cost[s] ?? 0) > 0).length);
  return (
    <span className={cn("@container relative block aspect-card w-16 shrink-0 overflow-hidden rounded-md ring-1 ring-foreground/10", className)}>
      <CardView card={art} className="size-full rounded-none" />
      <span className="absolute inset-x-0 top-0 aspect-[500/186]">
        <AssetImage src={band} alt="" sizes="8vw" className="object-fill" />
        <span className="absolute inset-x-[5cqw] top-[4cqw] flex items-center gap-[3cqw] text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.8)]">
          <span className="min-w-[14cqw] font-display text-[length:24cqw] leading-none font-black [-webkit-text-stroke:1.5px_black] [paint-order:stroke_fill]">
            {card.points || ""}
          </span>
          {Array.from({ length: card.crowns }).map((_, i) => (
            <AvengersIcon key={i} className="size-[16cqw]" />
          ))}
          {Icon ? (
            <span className="flex size-[16cqw] items-center justify-center rounded-full bg-fuchsia-700 ring-1 ring-white/70" title={ABILITIES[card.ability!].label}>
              <Icon className="size-[10cqw] text-white" />
            </span>
          ) : null}
        </span>
        {card.bonusCount === 2 && card.bonus && card.bonus !== "wild" && ASSETS.tokens[card.bonus] ? (
          // A double bonus: a second stone in the band's second notch, left of its own.
          <span className="absolute top-[7cqw] right-[23cqw] size-[16cqw] overflow-hidden rounded-full" title="Counts as two bonuses">
            <AssetImage src={ASSETS.tokens[card.bonus]!} alt="" sizes="4vw" />
          </span>
        ) : null}
      </span>
      {/* The costs, a pip per token, in a column that covers the printed ones. */}
      <span
        className="absolute bottom-0 left-0 flex w-[29cqw] flex-col-reverse items-center gap-[4cqw] rounded-tr-md bg-cosmos-950/85 px-[3cqw] pt-[5cqw] pb-[5cqw]"
        style={{ minHeight: `calc(${rows} * 23cqw + 10cqw)` }}
      >
        {costs.map((t) => (
          <span
            key={t}
            title={tokenMeta(t).label}
            className={cn("flex size-[19cqw] items-center justify-center rounded-full text-[length:11cqw] font-black ring-1 ring-white/60", tokenMeta(t).swatch, tokenMeta(t).onSwatch)}
          >
            {card.cost[t]}
          </span>
        ))}
      </span>
    </span>
  );
}

/** The win tile, with Duel's three conditions on a panel over its printed strip: any one of them wins at once. */
function WinTile() {
  const image = ASSETS.winTile?.image;
  return (
    <Zoomable
      label="Show how to win"
      title="Any one of these wins"
      className="@container relative mx-auto aspect-[1404/670] w-36 overflow-hidden rounded-md ring-1 ring-foreground/10"
      zoomed={
        <div className="@container relative aspect-[1404/670] w-150 overflow-hidden rounded-xl">
          {image ? <AssetImage src={image} alt="" sizes="75vw" /> : null}
          <WinPanel />
        </div>
      }
    >
      {image ? <AssetImage src={image} alt="How to win" sizes="12vw" /> : null}
      <WinPanel />
    </Zoomable>
  );
}

/** The panel over the tile's printed strip: 20 points, or 10 Avengers marks, or 10 points in one color. */
function WinPanel() {
  const row = "flex items-center gap-[2cqw] font-display text-[length:7.5cqw] leading-none font-black text-white [-webkit-text-stroke:1px_black] [paint-order:stroke_fill]";
  return (
    <span className="absolute inset-y-0 left-0 flex w-[30cqw] flex-col items-center justify-center gap-[5cqw] bg-cosmos-950">
      <span className={row} title="20 points">
        20<span className="text-[length:4cqw] text-gold-200 ">PTS</span>
      </span>
      <span className={row} title="10 Avengers marks">
        10<AvengersIcon className="size-[8cqw]" />
      </span>
      <span className={row} title="10 points on cards of one color">
        10
        {/* The five colors on the points of a pentagon, the first at the top. */}
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
    </span>
  );
}

/** A Privilege scroll: bright while it is on the table to be taken, dim with the holder's name once taken. */
function Privilege({ takenBy }: { takenBy?: string }) {
  return (
    <span className="flex flex-col items-center gap-0.5">
      <span className={cn("flex size-7 items-center justify-center rounded-full ring-2 ring-inset", takenBy ? "bg-cosmos-950 text-cosmos-500 ring-cosmos-700" : "bg-gold-400 text-cosmos-950 ring-gold-200")} title={takenBy ? `Held by ${takenBy}` : "On the table"}>
        <ScrollText className="size-4" />
      </span>
      <span className="h-3 fs-3xs font-bold text-cosmos-300">{takenBy ?? ""}</span>
    </span>
  );
}

/** One of the board's reminders: do this, and your opponent gets a Privilege. */
function Hint({ children, title }: { children: ReactNode; title: string }) {
  return (
    <span className="flex h-6 items-center justify-between gap-1 rounded-md bg-cosmos-950/70 px-1.5 ring-1 ring-foreground/10" title={title}>
     <span className="flex justify-center mx-auto w-full">{children}</span> 
      <span className="fs-3xs text-cosmos-300 ml-auto">▸</span>
      <ScrollText className="size-3.5 text-gold-400" />
    </span>
  );
}

/** The board's three reminders of what hands the opponent a Privilege, printed above the spaces. */
function Reminders({ className }: { className?: string }) {
  return (
    <span className={cn("flex gap-1.5", className)}>
      <Hint title="Take 2 Pearls: your opponent gets a Privilege">
        <TokenChip color="time" size="sm" />
        <TokenChip color="time" size="sm" className="-ml-2.5" />
      </Hint>
      <Hint title="Refill the board: your opponent gets a Privilege">
        <Shuffle className="size-3.5 text-cosmos-300" />
      </Hint>
      <Hint title="Take 3 of one color: your opponent gets a Privilege">
        <span className="flex items-center">
          {[0, 1, 2].map((i) => (
            <span key={i} className={cn("flex size-5 items-center justify-center rounded-full bg-cosmos-700 text-cosmos-100 ring-1 ring-cosmos-300", i > 0 && "-ml-1.5")}>
              <Equal className="size-3" />
            </span>
          ))}
        </span>
      </Hint>
    </span>
  );
}

/** The Privileges a player holds, on their name tab beside their Avengers count. */
function HeldScrolls({ count }: { count: number }) {
  return (
    <span className="ml-1.5 flex items-center gap-0.5 fs-2xs font-bold" title="Privileges held">
      <ScrollText className="size-3.5 text-gold-400" />
      {count}
    </span>
  );
}

/** A Royal card: a Location tile with a panel over its printed left bar carrying the Royal's points and power. */
function RoyalCard({ points, ability, image, name, taken }: { points: number; ability: Ability | null; image: string; name: string; taken?: boolean }) {
  const Icon = ability ? ABILITIES[ability].icon : null;
  return (
    <span
      className={cn("@container relative block aspect-square w-12 shrink-0 overflow-hidden rounded-md ring-1 ring-gold-400/60", taken && "opacity-30")}
      title={`${name}: ${points} points${ability ? `, ${ABILITIES[ability].label}` : ", points only"}`}
    >
      <AssetImage src={image} alt={name} sizes="8vw" />
      <span className="absolute inset-y-0 left-0 flex w-[30cqw] flex-col items-center justify-between bg-cosmos-950 py-[6cqw]">
        <span className="font-display text-[length:22cqw] leading-none font-black text-white [-webkit-text-stroke:2px_black] [paint-order:stroke_fill]">{points}</span>
        <AvengersIcon className="size-[18cqw]" />
        {Icon ? (
          <span className="flex size-[18cqw] items-center justify-center rounded-full bg-fuchsia-700 ring-1 ring-white/70">
            <Icon className="size-[11cqw] text-white" />
          </span>
        ) : (
          <span className="size-[18cqw]" />
        )}
      </span>
    </span>
  );
}

function Grid({ grid, size, staged }: { grid: (TokenColor | null)[][]; size: "sm" | "lg"; staged?: boolean }) {
  return (
    <div className={cn("grid grid-cols-5", size === "sm" ? "gap-1" : "gap-1.5")}>
      {grid.flatMap((row, y) =>
        row.map((t, x) => (
          <span
            key={`${x},${y}`}
            className={cn(
              "relative flex items-center justify-center rounded-md ring-1 ring-inset ring-foreground/10",
              // The middle space is where the refill starts, so it is tinted apart, as on the board.
              x === 2 && y === 2 ? "bg-gold-600/30" : "bg-cosmos-900/80",
              size === "sm" ? "size-8" : "size-11",
              staged && STAGED.has(`${x},${y}`) && "ring-2 ring-gold-400",
            )}
          >
            {/* The printed path shows through the empty spaces, as on the board. */}
            {!t ? <PathMark cellKey={`${x},${y}`} /> : null}
            {t ? <TokenChip color={t} size={size === "sm" ? "default" : "lg"} /> : null}
          </span>
        )),
      )}
    </div>
  );
}

export function DuelPreview() {
  const [pyramid] = useState(dealPyramid);
  const [grid] = useState(dealGrid);
  const you = player(0, {
    tokens: { ...emptyTokens(), mind: 2, space: 1, time: 1, shield: 1 },
    bonuses: { ...emptyStones(), mind: 2, power: 1 },
    cards: ALL_CARDS.slice(0, 3).map((c) => c.id),
    points: 7,
    tags: 2,
    reserved: [{ cardId: ALL_CARDS[40].id, blind: false }],
  });
  const rival = player(1, {
    tokens: { ...emptyTokens(), soul: 3, reality: 1 },
    bonuses: { ...emptyStones(), soul: 1, reality: 2, space: 1 },
    cards: ALL_CARDS.slice(10, 14).map((c) => c.id),
    points: 9,
    tags: 3,
    reserved: [{ blind: true, level: 2 }],
  });
  const bagLeft = 25 - grid.flat().filter(Boolean).length;

  return (
    <div className="game-board theme-cosmos dark relative flex w-full items-end overflow-hidden bg-cosmos">
      <div className="flex h-100 w-full flex-col gap-2 p-2 pb-0">
        <div className="flex min-h-0 flex-1 justify-between gap-2">
          {/* The one opponent. */}
          <div className="flex w-44 flex-col gap-3">
            <PlayerPlaque player={rival} name="Rival" isCurrentTurn={false} turnEndsAt={null} turnSeconds={null} className="mt-7" tabClassName="w-40" tabExtra={<HeldScrolls count={1} />} />
            {/* The Royal cards: the first player to 3 Avengers marks takes one, and at 6 another. */}
            <div className="w-fit rounded-lg bg-cosmos-950/60 p-2 ring-1 ring-foreground/10" title="Royal cards: reach 3 Avengers marks and take one; 6, another">
              <span className="grid grid-cols-2 gap-1.5">
                {ROYALS.map((r, i) => (
                  <RoyalCard key={r.id} points={r.points} ability={r.ability} image={ROYAL_TILES[i].image} name={ROYAL_TILES[i].name} taken={i === 2} />
                ))}
              </span>
            </div>
            {/* The scrolls, taken ones named. Tap a scroll you hold to spend it on any one token. */}
            <div className="flex w-fit gap-2 rounded-lg bg-cosmos-950/60 p-2 ring-1 ring-foreground/10" title="Privileges: spend one you hold to take any one token, not Gold">
              <Privilege />
              <Privilege takenBy="Rival" />
              <Privilege takenBy="You" />
            </div>
          </div>

          {/* The pyramid, each row beside its deck. */}
          <div className="flex flex-col justify-between">
            {pyramid.map((row, i) => {
              const level = (3 - i) as 1 | 2 | 3;
              const back = ASSETS.deckBacks[level];
              return (
                <div key={level} className="flex items-center justify-center gap-2">
                  <span className="relative mr-2 aspect-card w-14 shrink-0 overflow-hidden rounded-md ring-1 ring-foreground/10">
                    {back ? <AssetImage src={back} alt={`Level ${level} deck`} /> : null}
                  </span>
                  {row.map(({ card, art }) => (
                    <DuelCardView key={card.id} card={card} art={art} className="w-14" />
                  ))}
                </div>
              );
            })}
          </div>

          {/* The side column: how to win, the Privileges, the Royal cards, and the token board. */}
          <div className="flex w-47 flex-col gap-1.5">
            <WinTile />
            {/* The grid is its own button: tap it to pick a line at full size. */}
            <Zoomable
              label="Show the token board large"
              title="Take up to 3 in a line"
              className="relative mx-auto rounded-lg bg-cosmos-950/60 p-1.5 ring-1 ring-foreground/10"
              zoomed={
                <div className="flex items-start gap-5 rounded-2xl bg-cosmos-950/90 p-4 ring-2 ring-gold-400">
                  <Grid grid={grid} size="lg" staged />
                  {/* The board's printed reminders, stacked beside the spaces. */}
                  <Reminders className="flex-col my-auto" />
                </div>
              }
            >
              <Grid grid={grid} size="sm" staged />
              <span className="absolute -top-2 -left-2 flex h-5 items-center gap-1 rounded-full bg-cosmos-700 px-1.5 fs-3xs font-black text-gold-200 ring-1 ring-gold-400/60" title="Tokens in the bag">
                <PaperBag className="size-3" /> {bagLeft}
              </span>
            </Zoomable>
          </div>
        </div>

        {/* The tray, as the Marvel board has it. */}
        <div className="flex h-16 shrink-0 items-stretch gap-2">
          <PlayerPlaque
            player={you}
            name="You"
            isCurrentTurn
            turnEndsAt={null}
            turnSeconds={null}
            hideTags
            tabExtra={<HeldScrolls count={1} />}
            className="w-40 rounded-t-2xl rounded-tl-none rounded-b-none bg-card [--tab:calc(var(--spacing)*8)]"
            openBottom
            tabClassName="w-32"
          >
            {/* What the staged line would take, as the Marvel board shows staged tokens here. */}
            <span className="flex items-center gap-1.5 fs-2xs font-bold text-cosmos-300">
              Taking
              {[grid[3][3], grid[4][4]].map((t, i) => (t ? <TokenChip key={i} color={t} size="sm" /> : null))}
            </span>
          </PlayerPlaque>
          <div className="mx-auto flex shrink-0 items-center gap-2 rounded-t-2xl rounded-b-none bg-card px-1.5 ring-1 ring-foreground/10">
            <HandTray tokens={you.tokens} bonuses={you.bonuses} cards={you.cards} tags={you.tags} stagedCount={3} />
            <DuelCardView card={DUEL_CARDS[31]} art={ALL_CARDS[40]} className="w-12" />
          </div>
          <EndTurnBar hasStaged overLimit={false} disabled={false} submitting={false} onConfirm={() => {}} />
        </div>
      </div>
    </div>
  );
}
