"use client";

import { cn } from "cn";

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
  /** Avengers tags across recruited cards. */
  tags: number;
  /** Tokens picked this turn — counted toward the n/10 indicator. */
  stagedCount: number;
  className?: string;
}

const SLOT = "absolute flex size-7 items-center justify-center text-sm font-black tabular-nums";
const EMPTY = "bg-foreground/10";

/**
 * The viewer's own holdings (ARCHITECTURE.md §6 bottom-center): an n/10
 * token hand-limit indicator, then one column per color — a square for
 * cards (bonuses) with a circle for tokens tucked under its corner, then
 * the Avengers tag count. Empty slots stay visible so a color never moves.
 */
export function HandTray({ tokens, bonuses, tags, stagedCount, className }: HandTrayProps) {
  const total = totalTokens(tokens) + stagedCount;

  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      <span
        className={cn("-rotate-6 text-2xl font-black tabular-nums", total > HAND_LIMIT && "text-destructive")}
        title="Tokens held / hand limit"
      >
        {total}
        <span className="text-sm">/{HAND_LIMIT}</span>
      </span>
      <span className="h-12 w-px bg-border" />
      <div className="flex gap-1">
        {TOKEN_COLORS.map((color) => {
          const meta = tokenMeta(color);
          const filled = cn(meta.swatch, meta.onSwatch);
          const bonus = STONES.includes(color as Stone) ? bonuses[color as Stone] : null;
          return (
            <div key={color} className="relative h-13 w-8">
              {bonus !== null ? (
                <span
                  title={`${meta.label} cards`}
                  className={cn(SLOT, "top-0 left-0 items-start rounded-md leading-tight", bonus > 0 ? filled : EMPTY)}
                >
                  {bonus > 0 ? bonus : null}
                </span>
              ) : null}
              <span
                title={`${meta.label} tokens`}
                className={cn(
                  SLOT,
                  "right-0 bottom-0 rounded-full ring-2 ring-card",
                  tokens[color] > 0 ? filled : "bg-muted",
                )}
              >
                {tokens[color] > 0 ? tokens[color] : null}
              </span>
            </div>
          );
        })}
      </div>
      <span
        className={cn("ml-1 flex items-center gap-1 text-xl font-black tabular-nums", tags === 0 && "opacity-40")}
        title="Avengers tags"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-white text-base text-red-600 ring-1 ring-black/30">
          A
        </span>
        {tags}
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
