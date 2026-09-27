"use client";

import { cn } from "cn";

import { TokenChip } from "@/components/game/TokenChip";
import { tokenMeta } from "@/components/game/stone-colors";
import { HAND_LIMIT, TOKEN_COLORS, totalTokens, type Stone, type TokenCounts } from "@/lib/engine/types";

interface HandTrayProps {
  tokens: TokenCounts;
  /** Tokens picked from the bank this turn but not yet submitted. */
  stagedColors: Stone[];
  disabled?: boolean;
  onUnstageTokenColor: (color: Stone) => void;
  className?: string;
}

/**
 * The viewer's own personal token tray (ARCHITECTURE.md §6 bottom-center)
 * with an n/10 hand-limit indicator. Tokens staged this turn sit in their
 * own "Taking this turn" box beside it; tapping one puts it back.
 */
export function HandTray({ tokens, stagedColors, disabled, onUnstageTokenColor, className }: HandTrayProps) {
  const total = totalTokens(tokens) + stagedColors.length;
  const over = total > HAND_LIMIT;

  return (
    <div className={cn("flex items-stretch gap-2", className)}>
      <div className="flex min-h-16 min-w-56 flex-col gap-1.5 rounded-lg bg-card p-2.5 ring-1 ring-foreground/10">
        <div className="flex items-center justify-between">
          <h3 className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
            Your tokens
          </h3>
          <span
            className={cn(
              "text-xs font-bold tabular-nums",
              over ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {total}/{HAND_LIMIT}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TOKEN_COLORS.filter((c) => tokens[c] > 0).map((c) => (
            <TokenChip key={c} color={c} count={tokens[c]} />
          ))}
          {totalTokens(tokens) === 0 ? (
            <span className="text-[0.65rem] text-muted-foreground">No tokens yet</span>
          ) : null}
        </div>
      </div>

      {stagedColors.length > 0 ? (
        <div className="flex flex-col gap-1.5 rounded-lg border-2 border-dashed border-primary bg-primary/10 p-2.5">
          <h3 className="text-[0.65rem] font-medium tracking-wide text-primary uppercase">
            Taking this turn
          </h3>
          <div className="flex gap-1.5">
            {stagedColors.map((c, i) => (
              <button
                key={`${c}-${i}`}
                type="button"
                disabled={disabled}
                aria-label={`Put back ${tokenMeta(c).label}`}
                onClick={() => onUnstageTokenColor(c)}
                className="rounded-full"
              >
                <TokenChip color={c} />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
