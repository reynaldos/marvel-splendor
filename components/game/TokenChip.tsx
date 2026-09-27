import { cn } from "cn";

import type { TokenColor } from "@/lib/engine/types";
import { tokenMeta } from "@/components/game/stone-colors";

interface TokenChipProps {
  color: TokenColor;
  /** Count badge; omit or pass 0 to hide the badge. */
  count?: number;
  size?: "sm" | "default" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<TokenChipProps["size"]>, string> = {
  sm: "size-5 text-[0.6rem]",
  default: "size-8 text-xs",
  lg: "size-10 text-sm",
};

/**
 * A single colored token circle with an optional count badge — the atomic
 * visual reused by TokenBank, HandTray, PlayerPlaque, and the RETURN_TOKENS
 * modal.
 */
export function TokenChip({ color, count, size = "default", className }: TokenChipProps) {
  const meta = tokenMeta(color);
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ring-black/10 dark:ring-white/10",
        meta.swatch,
        meta.onSwatch,
        SIZE_CLASSES[size],
        className,
      )}
      title={meta.label}
    >
      {typeof count === "number" ? count : null}
      <span className="sr-only">{meta.label}</span>
    </span>
  );
}
