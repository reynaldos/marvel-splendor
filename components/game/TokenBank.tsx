"use client";

import { cn } from "cn";

import { TokenChip } from "@/components/game/TokenChip";
import { tokenMeta } from "@/components/game/stone-colors";
import { canAddTokenColor } from "@/components/game/token-rules";
import { STONES, TOKEN_COLORS, type Stone, type TokenCounts } from "@/lib/engine/types";
import type { StagedAction } from "@/components/game/staged-action";

interface TokenBankProps {
  supply: TokenCounts;
  staged: StagedAction | null;
  disabled?: boolean;
  onStageTokenColor: (color: Stone) => void;
}

/**
 * The 7 shared token stacks (ARCHITECTURE.md §6 right rail). Tapping a
 * basic-stone stack builds up a `TAKE_TOKENS` selection 1 pick at a time
 * (picks are undone from HandTray); green (time) and gray (shield) are
 * display-only here since they're never directly takeable.
 */
export function TokenBank({ supply, staged, disabled, onStageTokenColor }: TokenBankProps) {
  const selectedColors = staged?.kind === "tokens" ? staged.colors : [];

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-card p-3 ring-1 ring-foreground/10">
      <h3 className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
        Token bank
      </h3>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {STONES.map((stone) => (
          <StoneStack
            key={stone}
            stone={stone}
            count={supply[stone]}
            selectedCount={selectedColors.filter((c) => c === stone).length}
            canAdd={!disabled && canAddTokenColor(selectedColors, stone, supply)}
            onClick={() => onStageTokenColor(stone)}
          />
        ))}
        {TOKEN_COLORS.filter((c) => !STONES.includes(c as Stone)).map((color) => (
          <div key={color} className="flex flex-col items-center gap-1">
            <TokenChip color={color} count={supply[color]} size="lg" />
            <span className="text-[0.6rem] text-muted-foreground">{tokenMeta(color).label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StoneStack({
  stone,
  count,
  selectedCount,
  canAdd,
  onClick,
}: {
  stone: Stone;
  count: number;
  selectedCount: number;
  canAdd: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!canAdd}
      onClick={onClick}
      className="relative flex flex-col items-center gap-1 rounded-md p-1 transition-opacity hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
    >
      <TokenChip
        color={stone}
        count={count}
        size="lg"
        className={cn(selectedCount > 0 && "ring-2 ring-offset-2 ring-offset-background ring-primary")}
      />
      {selectedCount > 0 ? (
        <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[0.6rem] font-bold text-primary-foreground">
          {selectedCount}
        </span>
      ) : null}
      <span className="text-[0.6rem] text-muted-foreground">{tokenMeta(stone).label}</span>
    </button>
  );
}
