/**
 * A player's in-progress, not-yet-submitted turn action. `GameBoardClient`
 * owns the single `staged` value; `Board` fans the setters out to
 * `TokenBank`/`CardMarket`/dnd-kit handlers, and `EndTurnBar` renders +
 * confirms/cancels it. Keeping this as one discriminated union (rather than
 * three parallel bits of state) is what makes "only one action per turn" —
 * and "drag and click produce the exact same Move" — trivially true: both
 * input paths funnel into the same `set staged(...)` calls, and confirming
 * just runs `stagedActionToMove` once.
 */
import type { CardLevel, Move, Stone } from "@/lib/engine/types";

export type StagedAction =
  | { kind: "tokens"; colors: Stone[] }
  | { kind: "reserve"; from: "market"; level: CardLevel; cardId: string }
  | { kind: "reserve"; from: "deck"; level: CardLevel }
  | { kind: "recruit"; from: "market" | "reserve"; cardId: string };

export function stagedActionToMove(staged: StagedAction): Move {
  switch (staged.kind) {
    case "tokens":
      return { type: "TAKE_TOKENS", colors: staged.colors };
    case "reserve":
      return staged.from === "market"
        ? { type: "RESERVE", from: "market", level: staged.level, cardId: staged.cardId }
        : { type: "RESERVE", from: "deck", level: staged.level };
    case "recruit":
      return { type: "RECRUIT", from: staged.from, cardId: staged.cardId };
  }
}
