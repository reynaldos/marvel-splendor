/**
 * Shared stone/token -> color mapping (ARCHITECTURE.md §1 / §6 style notes).
 * Pure data, no "use client" needed — every card/token/location visual in
 * components/game/* imports from here so the palette is defined exactly once.
 *
 * Convention: mind=yellow, space=blue, soul=orange, power=purple,
 * reality=red, time=green (Time Stone), shield=gray (S.H.I.E.L.D. wildcard).
 */
import type { Stone, TokenColor } from "@/lib/engine/types";

export interface TokenColorMeta {
  label: string;
  /** Tailwind background class for a solid swatch/chip/pip. */
  swatch: string;
  /** Tailwind text color class readable on top of `swatch`. */
  onSwatch: string;
  /** Tailwind ring color class for selection/affordable highlights. */
  ring: string;
  /** Tailwind border color class. */
  border: string;
  /** Tailwind text color class for using the color as foreground text. */
  text: string;
  /** Raw hex (no `#`) for placehold.co placeholder art URLs. */
  hex: string;
}

export const STONE_COLORS: Record<Stone, TokenColorMeta> = {
  mind: {
    label: "Mind",
    swatch: "bg-yellow-400",
    onSwatch: "text-yellow-950",
    ring: "ring-yellow-400",
    border: "border-yellow-400",
    text: "text-yellow-600 dark:text-yellow-400",
    hex: "eab308",
  },
  space: {
    label: "Space",
    swatch: "bg-blue-500",
    onSwatch: "text-white",
    ring: "ring-blue-500",
    border: "border-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    hex: "3b82f6",
  },
  soul: {
    label: "Soul",
    swatch: "bg-orange-500",
    onSwatch: "text-white",
    ring: "ring-orange-500",
    border: "border-orange-500",
    text: "text-orange-600 dark:text-orange-400",
    hex: "f97316",
  },
  power: {
    label: "Power",
    swatch: "bg-purple-500",
    onSwatch: "text-white",
    ring: "ring-purple-500",
    border: "border-purple-500",
    text: "text-purple-600 dark:text-purple-400",
    hex: "a855f7",
  },
  reality: {
    label: "Reality",
    swatch: "bg-red-500",
    onSwatch: "text-white",
    ring: "ring-red-500",
    border: "border-red-500",
    text: "text-red-600 dark:text-red-400",
    hex: "ef4444",
  },
};

export const TOKEN_COLORS_META: Record<TokenColor, TokenColorMeta> = {
  ...STONE_COLORS,
  time: {
    label: "Time",
    swatch: "bg-green-500",
    onSwatch: "text-white",
    ring: "ring-green-500",
    border: "border-green-500",
    text: "text-green-600 dark:text-green-400",
    hex: "22c55e",
  },
  shield: {
    label: "S.H.I.E.L.D.",
    swatch: "bg-zinc-400 dark:bg-zinc-500",
    onSwatch: "text-zinc-950 dark:text-white",
    ring: "ring-zinc-400",
    border: "border-zinc-400",
    text: "text-zinc-600 dark:text-zinc-300",
    hex: "a1a1aa",
  },
};

export function tokenMeta(color: TokenColor): TokenColorMeta {
  return TOKEN_COLORS_META[color];
}

/** placehold.co placeholder art URL for a card, colored by its bonus stone. */
export function cardArtUrl(cardId: string, bonus: Stone, size = "200x280"): string {
  return `https://placehold.co/${size}/${STONE_COLORS[bonus].hex}/ffffff?text=${encodeURIComponent(cardId)}`;
}
