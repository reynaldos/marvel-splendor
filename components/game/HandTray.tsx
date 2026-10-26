"use client";

import type { ReactNode } from "react";
import { cn } from "cn";

import { AvengersIcon } from "@/components/game/assets";
import { TeamView } from "@/components/game/TeamView";
import { TokenChip } from "@/components/game/TokenChip";
import { tokenMeta } from "@/components/game/stone-colors";
import {
  HAND_LIMIT,
  STONES,
  TOKEN_COLORS,
  totalTokens,
  type Stone,
  type StoneCounts,
  type TokenCounts,
} from "@/lib/engine/types";

interface HandTrayProps {
  tokens: TokenCounts;
  bonuses: StoneCounts;
  /** Recruited card ids, for the View team popup. */
  cards: string[];
  /** Avengers tags across recruited cards. */
  tags: number;
  /** Tokens picked this turn — counted toward the n/10 indicator. */
  stagedCount: number;
  /** The cards are Duel cards, shown with their Duel faces. */
  duel?: boolean;
  /** Drawn under the Avengers count (the Duel player's Privileges). */
  extra?: ReactNode;
  className?: string;
}

const SLOT = "absolute flex size-7 items-center justify-center text-sm font-black tabular-nums";
const EMPTY = "bg-foreground/10";

/**
 * The viewer's own holdings (ARCHITECTURE.md §6 bottom-center): an n/10
 * token hand-limit indicator over a View team button, then one column per
 * color — a square for cards (bonuses) with the stone's token tucked under
 * its corner, its count on a badge — then the Avengers tag count. Empty
 * slots stay visible so a color never moves.
 */
export function HandTray({ tokens, bonuses, cards, tags, stagedCount, duel, extra, className }: HandTrayProps) {
  const total = totalTokens(tokens) + stagedCount;

  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      <div className="flex flex-col items-center gap-1">
        <span
          className={cn("-rotate-6 text-2xl font-black tabular-nums", total > HAND_LIMIT && "text-destructive")}
          title="Tokens held / hand limit"
        >
          {total}
          <span className="text-sm">/{HAND_LIMIT}</span>
        </span>
        <TeamView
          owner="Your"
          cardIds={cards}
          duel={duel}
          className="rounded-full bg-secondary px-2 py-0.5 fs-2xs font-bold whitespace-nowrap text-secondary-foreground uppercase"
        >
          View team
        </TeamView>
      </div>
      <span className="h-12 w-px bg-border" />
      <div className="flex gap-2">
        {TOKEN_COLORS.map((color) => {
          const meta = tokenMeta(color);
          const filled = cn(meta.swatch, meta.onSwatch);
          const bonus = STONES.includes(color as Stone) ? bonuses[color as Stone] : null;
          return (
            <div key={color} className="relative h-13 w-7">
              {bonus !== null ? (
                <span
                  title={`${meta.label} cards`}
                  // Sits a little above center, clear of the stone over the bottom edge.
                  className={cn(SLOT, "top-1 left-0 rounded-md pb-1 leading-none", bonus > 0 ? filled : EMPTY)}
                >
                  {bonus > 0 ? bonus : null}
                </span>
              ) : null}
              <span title={`${meta.label} tokens`} className="absolute bottom-0 left-0 size-7">
                {/* Held tokens show the stone itself; a dark grey one marks the empty slot.
                    Darkened, not see-through, so the square behind never shows through it. */}
                <TokenChip
                  color={color}
                  className={cn("size-full ring-2 ring-card", tokens[color] === 0 && "brightness-[.3] grayscale")}
                />
                {tokens[color] > 0 ? (
                  <span className="absolute -right-1.5 -bottom-1.5 flex size-4 items-center justify-center rounded-full bg-white fs-2xs leading-none font-black text-black tabular-nums ring-1 ring-black">
                    {tokens[color]}
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
      <span className="ml-1 flex flex-col items-center">
        <span className={cn("flex items-center gap-1 text-xl font-black tabular-nums", tags === 0 && "opacity-40")} title="Avengers tags">
          <AvengersIcon className="size-7 text-base" />
          {tags}
        </span>
        {extra}
      </span>
    </div>
  );
}

interface StagedTokensProps {
  colors: Stone[];
  disabled?: boolean;
  onUnstageTokenColor: (color: Stone) => void;
}

/** The tokens being taken this turn, kept apart from owned ones; tap one to put it back. */
export function StagedTokens({ colors, disabled, onUnstageTokenColor }: StagedTokensProps) {
  return (
    <div className="flex min-h-0 flex-1 items-center gap-1.5 px-1">
      {colors.map((c, i) => (
        <button
          key={`${c}-${i}`}
          type="button"
          disabled={disabled}
          aria-label={`Put back ${tokenMeta(c).label}`}
          onClick={() => onUnstageTokenColor(c)}
          // The button owns the size; up to 3 of these must fit the plaque's width.
          className="flex aspect-square w-10 shrink-0 rounded-full"
        >
          <TokenChip color={c} className="size-full shadow-md" />
        </button>
      ))}
    </div>
  );
}
