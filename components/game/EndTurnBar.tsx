import { Button } from "@/components/ui/button";
import { getCard } from "@/lib/engine/data";
import { tokenMeta } from "@/components/game/stone-colors";
import type { StagedAction } from "@/components/game/staged-action";

interface EndTurnBarProps {
  staged: StagedAction | null;
  disabled?: boolean;
  submitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}

/**
 * Bottom-right action affordances (ARCHITECTURE.md §6). There's no PASS
 * move in the engine — every legal turn takes some action — so "End Turn"
 * here just means "confirm and submit whatever is currently staged".
 */
export function EndTurnBar({ staged, disabled, submitting, onConfirm, onCancel, className }: EndTurnBarProps) {
  return (
    <div className={`flex flex-col items-end gap-1.5 ${className ?? ""}`}>
      <p className="max-w-56 text-right text-xs text-muted-foreground">
        {staged ? describeStaged(staged) : "Take tokens, reserve, or recruit a card to build your turn."}
      </p>
      <div className="flex gap-2">
        {staged ? (
          <Button type="button" variant="outline" size="sm" disabled={submitting} onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="button" size="sm" disabled={!staged || disabled || submitting} onClick={onConfirm}>
          {submitting ? "Submitting…" : "End Turn"}
        </Button>
      </div>
    </div>
  );
}

function describeStaged(staged: StagedAction): string {
  switch (staged.kind) {
    case "tokens":
      return `Take ${staged.colors.map((c) => tokenMeta(c).label).join(", ")}`;
    case "reserve":
      return staged.from === "market"
        ? `Reserve ${getCard(staged.cardId).name} (Lv${staged.level})`
        : `Reserve blind from the Level ${staged.level} deck`;
    case "recruit":
      return `Recruit ${getCard(staged.cardId).name}`;
  }
}

