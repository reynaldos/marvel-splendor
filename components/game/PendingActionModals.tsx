"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LocationTile } from "@/components/game/LocationTile";
import { TokenChip } from "@/components/game/TokenChip";
import { tokenMeta } from "@/components/game/stone-colors";
import { getLocation } from "@/lib/engine/data";
import type { PendingAction, TokenColor, TokenCounts } from "@/lib/engine/types";

/** The only colors a player may ever return (rulebook: green/Time can never be returned). */
const RETURNABLE_COLORS: TokenColor[] = ["mind", "space", "soul", "power", "reality", "shield"];

interface PendingActionModalsProps {
  pending: PendingAction | null;
  viewerTokens: TokenCounts;
  submitting?: boolean;
  onSubmitReturnTokens: (tokens: Partial<Record<TokenColor, number>>) => void;
  onSubmitChooseLocation: (locationId: string) => void;
}

/**
 * Modal(s) for the two `PendingAction` kinds (ARCHITECTURE.md's "pending
 * sub-moves"). Per the API contract, `pending` is only ever non-null for
 * the viewer's own seat, so this always blocks the *viewer's* input until
 * resolved — no close/escape affordance, since the server will reject any
 * other move type while a pending action is outstanding.
 */
export function PendingActionModals({
  pending,
  viewerTokens,
  submitting,
  onSubmitReturnTokens,
  onSubmitChooseLocation,
}: PendingActionModalsProps) {
  return (
    <>
      <ReturnTokensDialog
        pending={pending?.type === "RETURN_TOKENS" ? pending : null}
        viewerTokens={viewerTokens}
        submitting={submitting}
        onSubmit={onSubmitReturnTokens}
      />
      <ChooseLocationDialog
        pending={pending?.type === "CHOOSE_LOCATION" ? pending : null}
        submitting={submitting}
        onSubmit={onSubmitChooseLocation}
      />
    </>
  );
}

function ReturnTokensDialog({
  pending,
  viewerTokens,
  submitting,
  onSubmit,
}: {
  pending: { type: "RETURN_TOKENS"; mustReturn: number } | null;
  viewerTokens: TokenCounts;
  submitting?: boolean;
  onSubmit: (tokens: Partial<Record<TokenColor, number>>) => void;
}) {
  const [selection, setSelection] = useState<Partial<Record<TokenColor, number>>>({});

  // "Adjusting state when a prop changes", done during render rather than
  // in an effect (see react.dev/learn/you-might-not-need-an-effect): reset
  // the selection exactly once per distinct `pending` instance, since a
  // fresh RETURN_TOKENS pending is a new object every time the server sends
  // one, even if `mustReturn` happens to repeat the same number later.
  const [trackedPending, setTrackedPending] = useState(pending);
  if (pending !== trackedPending) {
    setTrackedPending(pending);
    setSelection({});
  }

  const total = Object.values(selection).reduce((sum, v) => sum + (v ?? 0), 0);
  const mustReturn = pending?.mustReturn ?? 0;

  function adjust(color: TokenColor, delta: number) {
    setSelection((prev) => {
      const current = prev[color] ?? 0;
      const max = viewerTokens[color] ?? 0;
      const next = Math.min(max, Math.max(0, current + delta));
      return { ...prev, [color]: next };
    });
  }

  return (
    <Dialog open={Boolean(pending)}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto"
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Return tokens</DialogTitle>
          <DialogDescription>
            You&apos;re over the 10-token hand limit — choose {mustReturn} token{mustReturn === 1 ? "" : "s"} to
            return. The Time Stone can never be returned.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {RETURNABLE_COLORS.filter((c) => viewerTokens[c] > 0).map((color) => (
            <div key={color} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TokenChip color={color} count={viewerTokens[color]} />
                <span className="text-xs">{tokenMeta(color).label}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  disabled={(selection[color] ?? 0) <= 0}
                  onClick={() => adjust(color, -1)}
                >
                  −
                </Button>
                <span className="w-4 text-center text-xs tabular-nums">{selection[color] ?? 0}</span>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  disabled={(selection[color] ?? 0) >= (viewerTokens[color] ?? 0)}
                  onClick={() => adjust(color, 1)}
                >
                  +
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <span className="mr-auto self-center text-xs text-muted-foreground">
            {total}/{mustReturn} selected
          </span>
          <Button
            type="button"
            disabled={total !== mustReturn || submitting}
            onClick={() => onSubmit(selection)}
          >
            {submitting ? "Submitting…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChooseLocationDialog({
  pending,
  submitting,
  onSubmit,
}: {
  pending: { type: "CHOOSE_LOCATION"; options: string[] } | null;
  submitting?: boolean;
  onSubmit: (locationId: string) => void;
}) {
  return (
    <Dialog open={Boolean(pending)}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto"
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Choose a Location</DialogTitle>
          <DialogDescription>
            You qualify for more than one Location tile — pick the one to claim.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap justify-center gap-3">
          {pending?.options.map((id) => (
            <LocationTile
              key={id}
              className="w-28"
              location={getLocation(id)}
              selectable
              onClick={() => !submitting && onSubmit(id)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
