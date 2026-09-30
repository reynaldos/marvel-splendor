"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";
import { ArrowDown, ArrowUp, Coins, Medal, Sparkles } from "lucide-react";

import { CardView } from "@/components/game/Card";
import { CARD_BY_ID } from "@/lib/engine/data";
import { FRAME_STYLE, type FrameTier } from "@/lib/frame-tier";
import type { GameRewards } from "@/lib/game-record";
import { accountFrameTier, progressForScore } from "@/lib/xp";

/** How long the coins count up and the XP bar fills, in ms. */
const COUNT_MS = 1600;

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** 0 → 1 over `ms`, starting after `delayMs`; straight to 1 for anyone who asked for less motion. */
function useCountUp(ms: number, delayMs: number): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setT(1);
      return;
    }
    let frame = 0;
    const start = performance.now() + delayMs;
    const tick = (now: number) => {
      const next = Math.min(1, Math.max(0, (now - start) / ms));
      setT(easeOut(next));
      if (next < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ms, delayMs]);
  return t;
}

/** A tier's name in its own colour: gold reads gold, ruby reads ruby. Recruited has no colour of its own. */
function TierName({ tier }: { tier: FrameTier }) {
  return (
    <span className="font-black" style={{ ...FRAME_STYLE[tier], color: "var(--frame-glow, var(--color-cosmos-300))" }}>
      {tier}
    </span>
  );
}

/**
 * What the game gave the viewer, counted up on the results screen: coins, then
 * the XP bar filling from where they were to where they are, wrapping and
 * flashing the new level when it crosses one, then any card that went up a level.
 */
export function RewardsPanel({ rewards, delay }: { rewards: GameRewards; delay: number }) {
  const t = useCountUp(COUNT_MS, delay * 1000);
  const { coins, xp, rating, cardLevelUps } = rewards;
  const swing = rating ? rating.after - rating.before : 0;
  const score = Math.round(xp.before + (xp.after - xp.before) * t);
  const progress = progressForScore(score);
  const startLevel = progressForScore(xp.before).level;
  const leveledUp = progress.level > startLevel;
  const tier = accountFrameTier(progress.level);
  const newTier = leveledUp && tier !== accountFrameTier(startLevel);

  return (
    <div className="result-row flex flex-col gap-2" style={{ animationDelay: `${delay}s` }}>
      <div className="flex items-center gap-3">
        {coins > 0 ? (
          <span className="flex h-9 items-center gap-1.5 rounded-full bg-cosmos-950 px-3 text-base font-black text-gold-400 tabular-nums" title="Coins earned">
            <Coins className="size-5" />+{Math.round(coins * t)}
          </span>
        ) : null}
        <span className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full bg-cosmos-950 px-3 tabular-nums" title="XP">
          <span key={progress.level} className={cn("flex items-center gap-1 text-sm font-black text-gold-400", leveledUp && "result-pop")}>
            <Sparkles className="size-4" />
            Lv {progress.level}
            {/* The gem badge the top bar puts on the profile picture, in the new tier's colour. */}
            {newTier ? <span aria-label={tier} className="gem-badge ml-1 size-4" style={FRAME_STYLE[tier]} /> : null}
          </span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-cosmos-800 ring-1 ring-cosmos-500 ring-inset">
            <span
              className="block h-full rounded-full bg-linear-to-r from-gold-600 to-gold-200"
              style={{ width: `${(100 * progress.into) / progress.span}%` }}
            />
          </span>
          <span className="text-sm font-black text-white">+{Math.round((xp.after - xp.before) * t)} XP</span>
        </span>
        {rating ? (
          <span
            title="Rating"
            className={cn(
              "flex h-9 items-center gap-1 rounded-full bg-cosmos-950 px-3 text-base font-black tabular-nums",
              swing > 0 ? "text-emerald-400" : swing < 0 ? "text-red-400" : "text-gold-400",
            )}
          >
            <Medal className="size-5" />
            {Math.round(rating.before + swing * t)}
            {swing > 0 ? <ArrowUp className="size-4" /> : swing < 0 ? <ArrowDown className="size-4" /> : null}
          </span>
        ) : null}
      </div>
      {cardLevelUps.length > 0 && t === 1 ? (
        <>
          <p className="result-row text-center text-sm font-bold text-gold-200">Cards levelled up</p>
          <ul className="grid grid-cols-3 gap-x-3 gap-y-2">
          {cardLevelUps.map((up, i) => {
            const card = CARD_BY_ID.get(up.cardId);
            return card ? (
              <li key={up.cardId} className="result-row flex items-center gap-2" style={{ animationDelay: `${0.15 + i * 0.15}s` }}>
                <span className="frame-gold aspect-card w-10 shrink-0 rounded-frame" style={FRAME_STYLE[up.to]}>
                  <CardView card={card} className="size-full" />
                </span>
                <span className="flex min-w-0 flex-col font-bold">
                  <span className="truncate text-xs">{card.name}</span>
                  <span className="fs-2xs whitespace-nowrap">
                    <TierName tier={up.from} />
                    <span className="text-cosmos-300"> → </span>
                    <TierName tier={up.to} />
                  </span>
                </span>
              </li>
            ) : null;
          })}
          </ul>
        </>
      ) : null}
    </div>
  );
}
