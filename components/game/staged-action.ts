/**
 * A player's in-progress, not-yet-submitted turn action. `GameBoardClient`
 * owns the single `staged` value; `Board` fans the setters out to
 * `TokenBank`/`CardMarket`/`HandTray`, and `EndTurnBar` renders +
 * confirms/cancels it. Keeping this as one discriminated union (rather than
 * three parallel bits of state) is what makes "only one action per turn"
 * trivially true: every tap funnels into the same `setStaged(...)` calls,
 * and confirming just runs `stagedActionToMove` once.
 */
import type { CardLevel, Move, Stone, TokenCounts } from "@/lib/engine/types";

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

/** The tokens a player would hold once the pick is played. */
export function tokensAfter(staged: StagedAction | null, held: TokenCounts, supply: TokenCounts): TokenCounts {
  const after = { ...held };
  if (staged?.kind === "tokens") for (const color of staged.colors) after[color] += 1;
  // A reserve comes with a S.H.I.E.L.D. token while any are left.
  if (staged?.kind === "reserve" && supply.shield > 0) after.shield += 1;
  return after;
}
