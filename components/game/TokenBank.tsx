"use client";

import { cn } from "cn";

import { PileLayers } from "@/components/game/PileLayers";
import { TokenChip } from "@/components/game/TokenChip";
import { canAddTokenColor } from "@/components/game/token-rules";
import { useTracedMove } from "@/components/game/traced-move";
import { STONES, TOKEN_COLORS, type Stone, type TokenColor, type TokenCounts } from "@/lib/engine/types";
import type { StagedAction } from "@/components/game/staged-action";

interface TokenBankProps {
  supply: TokenCounts;
  staged: StagedAction | null;
  disabled?: boolean;
  onStageTokenColor: (color: Stone) => void;
}

const ROW = "flex items-center gap-2";
const COUNT = "w-4 text-right text-sm font-bold tabular-nums text-muted-foreground";

/** One pile: the top token with the edges of those beneath it, or an empty space. */
function TokenPile({
  color,
  count,
  traced,
  className,
}: {
  color: TokenColor;
  count: number;
  /** How many of these another player has just taken. */
  traced: number;
  className?: string;
}) {
  return (
    // Taller than a token, so the pile's edge has room and no pile moves as it shrinks.
    <span className="relative flex h-10 w-9">
      {count > 0 ? (
        <>
          <PileLayers count={count} max={2} dx={0.4} dy={0.7} className="size-8">
            <TokenChip color={color} className="size-full" />
          </PileLayers>
          <TokenChip color={color} className={cn("size-8", className)} />
          {traced > 0 ? <span className="trace absolute top-0 left-0 size-8 rounded-full" /> : null}
          {traced > 1 ? (
            <span className="absolute -top-0.5 -right-0.5 z-10 flex size-4 items-center justify-center rounded-full bg-gold-200 fs-2xs font-bold text-cosmos-950">
              {traced}
            </span>
          ) : null}
        </>
      ) : null}
    </span>
  );
}

/**
 * The 7 shared token stacks, one column with the count beside each
 * (ARCHITECTURE.md §6 right rail). Tapping a basic-stone stack builds up a
 * `TAKE_TOKENS` selection 1 pick at a time (picks are undone from
 * StagedTokens); green (time) and gray (shield) are display-only here since
 * they're never directly takeable. A pile you can't take from looks the
 * same as one you can; an empty pile shows its 0 beside an empty space.
 */
export function TokenBank({ supply, staged, disabled, onStageTokenColor }: TokenBankProps) {
  const selectedColors = staged?.kind === "tokens" ? staged.colors : [];
  const taken = useTracedMove()?.move;
  // Reserving a card comes with a S.H.I.E.L.D. token, while there are any.
  const tracedColors: TokenColor[] =
    taken?.type === "TAKE_TOKENS" ? taken.colors : taken?.type === "RESERVE" ? ["shield"] : [];
  const traced = (color: TokenColor) => tracedColors.filter((c) => c === color).length;

  return (
    <div className="flex flex-col justify-between">
      {TOKEN_COLORS.map((color) => {
        if (!STONES.includes(color as Stone)) {
          return (
            <div key={color} className={ROW}>
              <span className={COUNT}>{supply[color]}</span>
              <TokenPile color={color} count={supply[color]} traced={traced(color)} />
            </div>
          );
        }
        const stone = color as Stone;
        const selectedCount = selectedColors.filter((c) => c === stone).length;
        const left = supply[stone] - selectedCount;
        return (
          <button
            key={stone}
            type="button"
            disabled={disabled || !canAddTokenColor(selectedColors, stone, supply)}
            onClick={() => onStageTokenColor(stone)}
            className={cn(ROW, "relative disabled:cursor-default")}
          >
            <span className={COUNT}>{left}</span>
            <TokenPile
              color={stone}
              count={left}
              traced={traced(stone)}
              className={cn(selectedCount > 0 && "ring-2 ring-primary ring-offset-2 ring-offset-background")}
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
