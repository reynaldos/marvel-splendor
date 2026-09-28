import { cn } from "cn";

import { Button } from "@/components/ui/button";

interface EndTurnBarProps {
  /** True once there is a staged action to submit. */
  hasStaged: boolean;
  /** True when the viewer holds, or is about to hold, more tokens than the limit. */
  overLimit?: boolean;
  disabled?: boolean;
  submitting?: boolean;
  onConfirm: () => void;
  /** Set when tokens must go back: the button opens the popup to choose them. */
  onReturn?: () => void;
  className?: string;
}

const BUTTON =
  "h-12 rounded-full px-4 font-display text-sm font-black tracking-wide uppercase shadow-lg disabled:bg-cosmos-700 disabled:text-cosmos-300 disabled:opacity-100";

/**
 * Bottom-right turn button. Gold "End Turn" plays what is picked; every turn
 * takes some action, so there is nothing to pass. It turns into a red
 * "Return" when the pick goes over the token limit: tapping it asks which
 * tokens to give back before anything is played.
 */
export function EndTurnBar({
  hasStaged,
  overLimit,
  disabled,
  submitting,
  onConfirm,
  onReturn,
  className,
}: EndTurnBarProps) {
  const returning = overLimit || Boolean(onReturn);

  return (
    <div className={cn("flex w-28 shrink-0 flex-col justify-end gap-1 pb-2", className)}>
      {returning ? (
        <p className="text-center fs-3xs font-bold whitespace-nowrap text-white">Return the excess tokens</p>
      ) : null}
      <Button
        type="button"
        className={cn(
          BUTTON,
          returning ? "bg-marvel text-white hover:bg-red-500" : "bg-gold-400 text-cosmos-950 hover:bg-gold-200",
        )}
        disabled={submitting || (!onReturn && (disabled || !hasStaged))}
        onClick={onReturn ?? onConfirm}
      >
        {submitting ? "Sending…" : returning ? "Return" : "End Turn"}
      </Button>
    </div>
  );
}
