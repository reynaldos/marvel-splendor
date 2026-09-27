"use client";

import { cn } from "cn";

import { TokenChip } from "@/components/game/TokenChip";
import { canAddTokenColor } from "@/components/game/token-rules";
import { STONES, TOKEN_COLORS, type Stone, type TokenCounts } from "@/lib/engine/types";
import type { StagedAction } from "@/components/game/staged-action";

interface TokenBankProps {
  supply: TokenCounts;
  staged: StagedAction | null;
  disabled?: boolean;
  onStageTokenColor: (color: Stone) => void;
}

const ROW = "flex items-center gap-1";
const COUNT = "w-4 text-right text-sm font-bold tabular-nums text-muted-foreground";

/**
 * The 7 shared token stacks, one column with the count beside each
 * (ARCHITECTURE.md §6 right rail). Tapping a basic-stone stack builds up a
 * `TAKE_TOKENS` selection 1 pick at a time (picks are undone from
 * StagedTokens); green (time) and gray (shield) are display-only here since
 * they're never directly takeable.
 */
export function TokenBank({ supply, staged, disabled, onStageTokenColor }: TokenBankProps) {
  const selectedColors = staged?.kind === "tokens" ? staged.colors : [];

  return (
    <div className="flex flex-col justify-between">
      {TOKEN_COLORS.map((color) => {
        if (!STONES.includes(color as Stone)) {
          return (
            <div key={color} className={ROW}>
              <span className={COUNT}>{supply[color]}</span>
              <TokenChip color={color} className="size-9" />
            </div>
          );
        }
        const stone = color as Stone;
        const selectedCount = selectedColors.filter((c) => c === stone).length;
        return (
          <button
            key={stone}
            type="button"
            disabled={disabled || !canAddTokenColor(selectedColors, stone, supply)}
            onClick={() => onStageTokenColor(stone)}
            className={cn(ROW, "relative transition-opacity disabled:cursor-not-allowed disabled:opacity-40")}
          >
            <span className={COUNT}>{supply[stone] - selectedCount}</span>
            <TokenChip
              color={stone}
              className={cn(
                "size-9",
                selectedCount > 0 && "ring-2 ring-primary ring-offset-2 ring-offset-background",
              )}
            />
            {selectedCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary fs-2xs font-bold text-primary-foreground">
                {selectedCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
