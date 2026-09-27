"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "cn";

import { TokenChip } from "@/components/game/TokenChip";
import { HAND_LIMIT, TOKEN_COLORS, totalTokens, type TokenCounts } from "@/lib/engine/types";

interface HandTrayProps {
  tokens: TokenCounts;
  disabled?: boolean;
  className?: string;
}

/**
 * The viewer's own personal token tray (ARCHITECTURE.md §6 bottom-center)
 * with an n/10 hand-limit indicator, and the dnd-kit drop zone for
 * drag-token-to-tray (staging TAKE_TOKENS) and drag-card-to-tray (RECRUIT).
 */
export function HandTray({ tokens, disabled, className }: HandTrayProps) {
  const { setNodeRef, isOver } = useDroppable({ id: "hand-tray", disabled });
  const total = totalTokens(tokens);
  const over = total > HAND_LIMIT;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-16 min-w-56 flex-col gap-1.5 rounded-lg bg-card p-2.5 ring-1 ring-foreground/10 transition-colors",
        isOver && !disabled && "bg-primary/10 ring-2 ring-primary",
        className,
      )}
    >
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
        {total === 0 ? <span className="text-[0.65rem] text-muted-foreground">No tokens yet</span> : null}
      </div>
    </div>
  );
}
