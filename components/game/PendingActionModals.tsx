"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LocationTile } from "@/components/game/LocationTile";
import { TokenChip } from "@/components/game/TokenChip";
import { tokenMeta } from "@/components/game/stone-colors";
import { getLocation } from "@/lib/engine/data";
import { HAND_LIMIT, totalTokens, type PendingAction, type TokenColor, type TokenCounts } from "@/lib/engine/types";

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
  return (
    <Dialog open={Boolean(pending)}>
      <DialogContent
        className="theme-cosmos dark max-h-[90dvh] gap-3 overflow-y-auto border-2 border-gold-400 sm:max-w-xl"
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {pending ? (
          // Keyed so each new request starts with nothing picked.
          <ReturnTokens
            key={`${pending.mustReturn}-${totalTokens(viewerTokens)}`}
            mustReturn={pending.mustReturn}
            tokens={viewerTokens}
            submitting={submitting}
            onSubmit={onSubmit}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

const ROW = "flex min-h-24 flex-1 flex-wrap content-center items-center gap-3 rounded-xl p-2";
const COLUMN = "flex flex-col gap-1";
const HEADING = "text-xs font-bold text-muted-foreground uppercase";

/** One pile of a color: tap it to move a token to the other row. */
function Pile({ color, count, label, onTap }: { color: TokenColor; count: number; label: string; onTap: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onTap} className="relative rounded-full">
      <TokenChip color={color} className="size-10" />
      <span className="absolute -right-1.5 -bottom-1 flex size-5 items-center justify-center rounded-full bg-white text-xs font-black text-black ring-1 ring-black">
        {count}
      </span>
    </button>
  );
}

/**
 * Choosing which tokens to give back when over the hand limit. Tap a token
 * you hold to send it back; tap one in the bottom row to keep it after all.
 */
export function ReturnTokens({
  mustReturn,
  tokens,
  submitting,
  onSubmit,
}: {
  mustReturn: number;
  tokens: TokenCounts;
  submitting?: boolean;
  onSubmit: (tokens: Partial<Record<TokenColor, number>>) => void;
}) {
  const [returning, setReturning] = useState<Partial<Record<TokenColor, number>>>({});
  const picked = Object.values(returning).reduce((sum, n) => sum + (n ?? 0), 0);
  const left = mustReturn - picked;
  const move = (color: TokenColor, by: number) =>
    setReturning((prev) => ({ ...prev, [color]: (prev[color] ?? 0) + by }));

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display tracking-wide text-gold-400 uppercase">
          Too many tokens
        </DialogTitle>
        <DialogDescription>
          You hold {totalTokens(tokens)} and can keep {HAND_LIMIT}. Tap {mustReturn} to give back.
        </DialogDescription>
      </DialogHeader>

      {/* Side by side, so the whole popup fits a phone held sideways. */}
      <div className="grid grid-cols-2 gap-3">
        <div className={COLUMN}>
          <span className={HEADING}>Keeping</span>
          <div className={`${ROW} bg-cosmos-950`}>
          {RETURNABLE_COLORS.map((color) => {
            const kept = tokens[color] - (returning[color] ?? 0);
            return kept > 0 ? (
              <Pile
                key={color}
                color={color}
                count={kept}
                label={`Give back a ${tokenMeta(color).label} token`}
                // Once enough are picked, further taps do nothing.
                onTap={() => left > 0 && move(color, 1)}
              />
            ) : null;
          })}
          {tokens.time > 0 ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <TokenChip color="time" className="size-8 opacity-60" />
              Always kept
            </span>
          ) : null}
          </div>
        </div>

        <div className={COLUMN}>
          <span className={HEADING}>
            Giving back {picked}/{mustReturn}
          </span>
          <div className={`${ROW} border-2 border-dashed border-gold-400/60`}>
          {picked === 0 ? <span className="text-xs text-muted-foreground">Tap a token to give it back</span> : null}
          {RETURNABLE_COLORS.map((color) =>
            (returning[color] ?? 0) > 0 ? (
              <Pile
                key={color}
                color={color}
                count={returning[color] ?? 0}
                label={`Keep a ${tokenMeta(color).label} token`}
                onTap={() => move(color, -1)}
              />
            ) : null,
          )}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          className="w-full bg-marvel font-display font-black tracking-wide text-white uppercase hover:bg-red-500"
          disabled={left !== 0 || submitting}
          onClick={() => onSubmit(returning)}
        >
          {submitting ? "Sending…" : left > 0 ? `Pick ${left} more` : `Give back ${mustReturn}`}
        </Button>
      </DialogFooter>
    </>
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
        className="theme-cosmos dark border-2 border-gold-400 max-h-[90dvh] overflow-y-auto"
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
