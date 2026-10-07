import type { CSSProperties, ReactNode } from "react";
import { cn } from "cn";
import { ArrowUp, Star } from "lucide-react";

import { ASSETS, AssetImage } from "@/components/game/assets";
import { CardView } from "@/components/game/Card";
import { LocationTile } from "@/components/game/LocationTile";
import { TokenChip } from "@/components/game/TokenChip";
import type { SfxName } from "@/lib/audio-tracks";
import { ALL_CARDS, getCard, getLocation } from "@/lib/engine/data";
import { STONES, TOKEN_COLORS, type CardLevel, type Stone, type TokenColor } from "@/lib/engine/types";

/** Seconds into the slide a piece arrives. */
const at = (s: number): CSSProperties => ({ animationDelay: `${s}s` });
/** Spacing steps, as a CSS length. */
const steps = (n: number) => `calc(var(--spacing) * ${n})`;

const CARD = "w-24 rounded-[10%/7.1%] shadow-lg";
const BIG_CARD = "w-32 rounded-[10%/7.1%] shadow-lg";

/** Lands with a bounce after `delay`. */
function Pop({ delay = 0, className, style, children }: { delay?: number; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <span className={cn("result-pop block", className)} style={{ ...at(delay), ...style }}>
      {children}
    </span>
  );
}

/**
 * Moves `dx`,`dy` steps from where it is drawn after `delay`. `sink` fades it away as it
 * goes; `loop-a` and `loop-b` go and come back over and over, in the first or second half
 * of the cycle.
 */
function Move({ dx = 0, dy = 0, delay = 0, anim = "move", className, children }: { dx?: number; dy?: number; delay?: number; anim?: "move" | "sink" | "loop-a" | "loop-b"; className?: string; children: ReactNode }) {
  return (
    <span className={cn(`howto-${anim}`, "block", className)} style={{ "--dx": steps(dx), "--dy": steps(dy), ...at(delay) } as CSSProperties}>
      {children}
    </span>
  );
}

function Stone({ color, className }: { color: TokenColor; className?: string }) {
  return <TokenChip color={color} className={cn("size-14 shadow-lg ring-2 ring-black/30", className)} />;
}

function PointStar({ points, className }: { points: number; className?: string }) {
  return (
    <span className={cn("relative flex size-12 items-center justify-center drop-shadow-md", className)}>
      <Star className="absolute inset-0 size-full fill-gold-400 text-gold-600" strokeWidth={1.5} />
      <span className="relative pt-0.5 font-display text-base font-black text-cosmos-950">{points}</span>
    </span>
  );
}

function Tile({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  return (
    <span className={cn("relative block aspect-square w-24 overflow-hidden rounded-tile bg-cosmos-800 shadow-lg", className)}>
      {src ? <AssetImage src={src} alt={alt} /> : null}
    </span>
  );
}

function DeckBack({ level, className }: { level: CardLevel; className?: string }) {
  const src = ASSETS.deckBacks[level];
  return (
    <span className={cn("relative block aspect-card overflow-hidden bg-cosmos-800", CARD, className)}>
      {src ? <AssetImage src={src} alt={`Level ${level} deck`} /> : null}
    </span>
  );
}

/**
 * A stack of `count` stones. The top `top` of them drop into the hand below in one of the
 * two loops, or with `sink` fly off and fade as they are given back.
 */
function Pile({ color, count, top = 0, anim, delay = 0 }: { color: TokenColor; count: number; top?: number; anim: "loop-a" | "loop-b" | "sink"; delay?: number }) {
  const first = count - top;
  return (
    <span className="relative block size-14">
      {Array.from({ length: count }, (_, i) => {
        const order = i - first;
        const stone = <Stone color={color} />;
        return (
          <span key={i} className="absolute inset-0" style={{ translate: `0 ${steps(-i * 1.5)}` }}>
            {order < 0 ? (
              stone
            ) : anim === "sink" ? (
              <Move anim="sink" dy={-18} delay={delay + order * 0.3}>
                {stone}
              </Move>
            ) : (
              <Move anim={anim} dx={(order - (top - 1) / 2) * 16} dy={24 + i * 1.5} delay={delay + order * 0.25}>
                {stone}
              </Move>
            )}
          </span>
        );
      })}
    </span>
  );
}

function Fan({ ids }: { ids: string[] }) {
  return (
    <div className="flex items-end">
      {ids.map((id, i) => (
        <Pop key={id} delay={i * 0.15} className={cn(i > 0 && "-ml-6")} style={{ rotate: `${(i - (ids.length - 1) / 2) * 8}deg` }}>
          <CardView card={getCard(id)} className={CARD} />
        </Pop>
      ))}
    </div>
  );
}

/** Cards with the bonus a Location asks for, `n` of each colour. */
function BonusRows({ requires, delay }: { requires: Partial<Record<Stone, number>>; delay: number }) {
  let i = 0;
  return (
    <div className="flex flex-col gap-3">
      {STONES.filter((s) => requires[s]).map((s) => (
        <div key={s} className="flex gap-2">
          {ALL_CARDS.filter((c) => c.bonus === s && c.level === 1 && c.image)
            .slice(0, requires[s])
            .map((card) => (
              <Pop key={card.id} delay={delay + i++ * 0.12}>
                <CardView card={card} className="w-14 rounded-md shadow-md" />
              </Pop>
            ))}
        </div>
      ))}
    </div>
  );
}

// The opening card: one stone of each colour it asks for, as in the game this copies.
const INTRO = getCard("c1-09");
const RECRUIT = getCard("c1-10");
const RECRUIT_COST = STONES.filter((s) => RECRUIT.cost[s]).flatMap((s) => Array.from({ length: RECRUIT.cost[s]! }, () => s));
const TRISKELION = getLocation("loc-01a");
// A hand of 13: the marked stacks each give one back to get down to 10.
const HAND: [TokenColor, number, boolean][] = [
  ["space", 3, true],
  ["reality", 2, false],
  ["power", 1, false],
  ["shield", 3, false],
  ["mind", 2, true],
  ["soul", 2, true],
];
// The round is finished: the 2nd player reached 16, but the 3rd passed them.
const FINISH = [
  { points: 11, who: "1st player" },
  { points: 16, who: "2nd player" },
  { points: 17, who: "3rd player", wins: true },
  { points: 13, who: "Last player" },
];

/** Each slide's caption, its art, and the sound it plays as it opens. */
export const SLIDES: { text: string; art: ReactNode; sfx?: SfxName }[] = [
  {
    text: "Gather the Infinity Stones, recruit a team of heroes, and claim the Gauntlet.",
    art: (
      <>
        {/* Two views, once through: the stones, which then make way for a card and what it costs. */}
        <span className="howto-out absolute inset-0 flex items-center justify-center gap-4">
          {TOKEN_COLORS.map((c, i) => (
            <Pop key={c} delay={i * 0.12}>
              <Stone color={c} className="size-16" />
            </Pop>
          ))}
        </span>
        <span className="absolute inset-0 flex items-center justify-center gap-6">
          <span className="flex flex-col gap-2">
            {STONES.filter((c) => INTRO.cost[c]).map((c, i) => (
              <Pop key={c} delay={3.4 + i * 0.15}>
                <Stone color={c} className="size-12" />
              </Pop>
            ))}
          </span>
          <Pop delay={3.1}>
            <CardView card={INTRO} className={BIG_CARD} />
          </Pop>
        </span>
      </>
    ),
  },
  {
    text: "Points come from character cards, Location tiles and the Avengers Assemble tile.",
    art: (
      <div className="flex items-end gap-14">
        <Fan ids={["c3-10", "c3-11", "c3-08"]} />
        <div className="flex items-end gap-4">
          <Pop delay={0.6}>
            <LocationTile location={getLocation("loc-02b")} className="w-24 shadow-lg" />
          </Pop>
          <Pop delay={0.75}>
            <LocationTile location={getLocation("loc-04a")} className="w-24 shadow-lg" />
          </Pop>
          <Pop delay={0.9}>
            <Tile src={ASSETS.avengersTile} alt="Avengers Assemble" />
          </Pop>
        </div>
      </div>
    ),
  },
  {
    text: "Each turn, do one thing: take stones, reserve a card, or recruit a card.",
    art: (
      <div className="flex items-center gap-20">
        <Pop className="relative size-30">
          {(["mind", "space", "power", "soul"] as const).map((s, i) => (
            <Stone key={s} color={s} className={cn("absolute", i % 2 ? "left-0" : "right-0", i < 2 ? "top-0" : "bottom-0")} />
          ))}
          <Stone color="reality" className="absolute top-1/2 left-1/2 size-16 -translate-1/2" />
        </Pop>
        <Pop delay={0.3} className="relative">
          <DeckBack level={2} className="rotate-6" />
          <Stone color="shield" className="absolute -top-4 -left-6" />
        </Pop>
        <Pop delay={0.6} className="flex flex-col items-center">
          <span className="z-10 -mb-5 flex gap-1">
            {RECRUIT_COST.map((s, i) => (
              <Stone key={i} color={s} className="size-9" />
            ))}
          </span>
          <CardView card={RECRUIT} className={CARD} />
        </Pop>
      </div>
    ),
  },
  {
    text: "Take 3 stones of different colours, or 2 of one colour while its pile still has 4 or more. The Time Stone and S.H.I.E.L.D. are never taken this way.",
    sfx: "tap",
    art: (
      <div className="flex items-end gap-6 pb-24">
        {STONES.map((s) => (
          <Pile key={s} color={s} count={4} top={s === "space" ? 2 : s === "reality" ? 0 : 1} anim={s === "space" ? "loop-b" : "loop-a"} />
        ))}
      </div>
    ),
  },
  {
    text: "Reserve a card, face up or blind from a deck, and take a S.H.I.E.L.D. token. It pays for any stone. You can hold 3 reserved cards.",
    sfx: "reserve",
    art: (
      <div className="flex items-center gap-24">
        <div className="flex items-end">
          <Pop>
            <DeckBack level={3} className="-rotate-6" />
          </Pop>
          <Pop delay={0.2} className="-ml-4">
            <CardView card={getCard("c2-05")} className={cn(CARD, "rotate-6")} />
          </Pop>
        </div>
        <Move dx={-28} dy={-8} delay={0.8}>
          <Stone color="shield" className="size-16" />
        </Move>
      </div>
    ),
  },
  {
    text: "Pay the stones a card asks for to recruit it. It is yours for good, with its points and its bonus.",
    sfx: "recruit",
    art: (
      <div className="flex items-center gap-8">
        <div className="grid grid-cols-2 gap-2">
          {/* Each stone leaves a faint copy behind, so the cost still reads once they are spent. */}
          {RECRUIT_COST.map((s, i) => (
            <span key={i} className="relative block">
              <Stone color={s} className="opacity-30" />
              <Move anim="sink" dx={31 + (1 - (i % 2)) * 16} dy={(1 - Math.floor(i / 2)) * 16} delay={0.6 + i * 0.2} className="absolute inset-0">
                <Stone color={s} />
              </Move>
            </span>
          ))}
        </div>
        <Pop>
          <span className="pack-flash block" style={at(1.6)}>
            <CardView card={RECRUIT} className={BIG_CARD} />
          </span>
        </Pop>
      </div>
    ),
  },
  {
    text: "A card's bonus stone pays one stone of its colour on every card you recruit after it, for the rest of the game.",
    art: (
      <div className="flex items-center gap-10">
        <Pop>
          <CardView card={getCard("c1-05")} className={BIG_CARD} />
        </Pop>
        <Pop delay={0.5} className="font-display text-4xl font-black text-gold-400">
          =
        </Pop>
        <Pop delay={0.7} className="glow-gold rounded-full">
          <Stone color="reality" className="size-20" />
        </Pop>
      </div>
    ),
  },
  {
    text: "You can hold 10 stones. With more at the end of your turn, give some back until you have 10. The Time Stone stays.",
    art: (
      <div className="flex items-end gap-6">
        {HAND.map(([color, count, back], i) => (
          <Pop key={color} delay={i * 0.12} className="relative">
            <Pile color={color} count={count} top={back ? 1 : 0} anim="sink" delay={1.8 + i * 0.25} />
            {back ? (
              <Pop delay={1.2 + i * 0.1} className="absolute -left-4 flex size-8 items-center justify-center rounded-full bg-marvel text-white shadow-md" style={{ top: steps(-2 - (count - 1) * 1.5) }}>
                <ArrowUp className="size-5" strokeWidth={3} />
              </Pop>
            ) : null}
          </Pop>
        ))}
      </div>
    ),
  },
  {
    text: "Own the cards a Location asks for, bonus by bonus, and it comes to you with 3 points. One Location a turn.",
    sfx: "location",
    art: (
      <div className="flex items-center gap-14">
        <Pop>
          <LocationTile location={TRISKELION} className="w-32 shadow-lg" />
        </Pop>
        <BonusRows requires={TRISKELION.requires} delay={0.3} />
      </div>
    ),
  },
  {
    text: "Cards carry Avengers tags. The first to 3 tags takes the Avengers Assemble tile, worth 3 points. Whoever gets more tags takes it from them.",
    sfx: "avengers",
    art: (
      <div className="flex items-center gap-20">
        <Fan ids={["c1-10", "c3-04", "c3-05"]} />
        <Pop delay={0.9}>
          <Tile src={ASSETS.avengersTile} alt="Avengers Assemble" className="w-32" />
        </Pop>
      </div>
    ),
  },
  {
    text: "Your first Level 3 card brings the Time Stone. You need it to win, and it is never spent or given back.",
    sfx: "timeStone",
    art: (
      <div className="flex items-center">
        <Pop>
          <CardView card={getCard("c3-12")} className={BIG_CARD} />
        </Pop>
        <Move dx={16} delay={0.8} className="-ml-8">
          <span className="glow-gold block rounded-full">
            <Stone color="time" className="size-20" />
          </span>
        </Move>
      </div>
    ),
  },
  {
    text: "Reach 16 points with a bonus of every colour and the Time Stone, and the end begins. Everyone finishes the round, then the most points wins.",
    art: (
      <div className="flex items-center gap-16">
        <Pop className="relative aspect-[1404/688] w-56 overflow-hidden rounded-xl shadow-lg">
          {ASSETS.winTile ? <AssetImage src={ASSETS.winTile.image} alt="Infinity Gauntlet" /> : null}
        </Pop>
        <div className="flex items-center gap-3">
          {FINISH.map(({ points, who, wins }, i) => (
            <Pop key={who} delay={0.5 + i * 0.25} className={cn("flex w-24 flex-col items-center gap-2", !wins && "opacity-60")}>
              <span className={cn("rounded-full bg-gold-400 px-2 font-display fs-2xs font-black tracking-wide text-cosmos-950 uppercase", !wins && "invisible")}>
                Winner
              </span>
              <PointStar points={points} className={cn("size-16", wins && "size-20 drop-shadow-[0_0_12px_rgb(246_201_69/0.8)]")} />
              <span className={cn("fs-2xs font-bold tracking-wide uppercase", wins ? "text-gold-400" : "text-cosmos-300")}>{who}</span>
            </Pop>
          ))}
        </div>
      </div>
    ),
  },
];
