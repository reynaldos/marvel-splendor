import { cn } from "cn";

import { Button } from "@/components/ui/button";

interface EndTurnBarProps {
  /** True once there is a staged action to submit. */
  hasStaged: boolean;
  disabled?: boolean;
  submitting?: boolean;
  onConfirm: () => void;
  className?: string;
}

/**
 * Bottom-right End Turn button (ARCHITECTURE.md §6). There's no PASS move
 * in the engine — every legal turn takes some action — so "End Turn" just
 * means "submit whatever is currently staged". Staged picks are undone
 * where they were made (tap the token, or the deck, again).
 */
export function EndTurnBar({ hasStaged, disabled, submitting, onConfirm, className }: EndTurnBarProps) {
  return (
    <div className={cn("flex w-28 shrink-0 flex-col justify-end pb-2", className)}>
      <Button
        type="button"
        className="h-12 rounded-full bg-marvel px-4 font-display text-sm font-black tracking-wide text-white uppercase shadow-lg hover:bg-red-500 disabled:bg-cosmos-700 disabled:text-cosmos-300 disabled:opacity-100"
        disabled={!hasStaged || disabled || submitting}
        onClick={onConfirm}
      >
        {submitting ? "Sending…" : "End Turn"}
      </Button>
    </div>
  );
}
