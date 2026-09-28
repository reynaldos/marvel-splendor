import { cn } from "cn";

import type { TokenColor } from "@/lib/engine/types";
import { ASSETS, AssetImage } from "@/components/game/assets";
import { tokenMeta } from "@/components/game/stone-colors";

interface TokenChipProps {
  color: TokenColor;
  /** Count badge; omit or pass 0 to hide the badge. */
  count?: number;
  size?: "sm" | "default" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<TokenChipProps["size"]>, string> = {
  sm: "size-5 fs-2xs",
  default: "size-8 text-xs",
  lg: "size-10 text-sm",
};

/**
 * A single token with an optional count badge — the atomic visual reused
 * by TokenBank, StagedTokens, and the RETURN_TOKENS modal. Shows the
 * token's art when data/assets.json supplies it, else a colored circle.
 */
export function TokenChip({ color, count, size = "default", className }: TokenChipProps) {
  const meta = tokenMeta(color);
  const art = ASSETS.tokens[color];
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ring-1 ring-black/10 dark:ring-white/10",
        art ? "text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.9)]" : [meta.swatch, meta.onSwatch],
        SIZE_CLASSES[size],
        className,
      )}
      title={meta.label}
    >
      {art ? <AssetImage src={art} alt="" sizes="6vw" /> : null}
      <span className="relative">{typeof count === "number" ? count : null}</span>
      <span className="sr-only">{meta.label}</span>
    </span>
  );
}
