/** A Duel player's picked-but-not-sent action: a line of tokens, or a blind reserve from a deck. Cards act on their own tap. */
import type { CardLevel, DuelMove } from "@/lib/duel/types";

export type DuelStaged = { kind: "line"; spaces: number[] } | { kind: "reserveDeck"; level: CardLevel };

export function stagedToMove(staged: DuelStaged): DuelMove {
  return staged.kind === "line" ? { type: "TAKE_LINE", spaces: staged.spaces } : { type: "RESERVE", from: "deck", level: staged.level };
}
