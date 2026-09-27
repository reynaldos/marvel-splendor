/**
 * Client-side helper for building a `TAKE_TOKENS` selection one click (or
 * one drag-drop) at a time, mirroring the rulebook clause in
 * ARCHITECTURE.md §1: "3 tokens of different colors" OR "2 of one color
 * (only if that stack has >= 4 before taking)". This is UI staging only —
 * the server (`lib/engine/validate.ts`) is the actual source of truth and
 * will reject anything illegal; this just keeps the click/drag affordances
 * from offering obviously-illegal combinations.
 */
import type { Stone, TokenCounts } from "@/lib/engine/types";

/** Whether `color` can be appended as the next pick given the current in-progress selection. */
export function canAddTokenColor(selected: Stone[], color: Stone, supply: TokenCounts): boolean {
  if (supply[color] <= 0) return false;
  if (selected.length === 0) return true;
  if (selected.length === 1) {
    if (selected[0] === color) {
      // Second token of the same color — only legal if the stack had >= 4 before taking.
      return supply[color] >= 4;
    }
    return true;
  }
  if (selected.length === 2) {
    const sameColorPair = selected[0] === selected[1];
    if (sameColorPair) return false; // "2 of one" selection is already complete.
    return !selected.includes(color); // extend to a 3rd distinct color only.
  }
  return false; // 3 already selected — selection is complete either way.
}
