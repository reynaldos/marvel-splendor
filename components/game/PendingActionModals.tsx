"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "cn";

import { Pill } from "@/components/ui/pill";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LocationTile } from "@/components/game/LocationTile";
import { TokenChip } from "@/components/game/TokenChip";
import { TurnTimer } from "@/components/game/TurnTimer";
import { tokenMeta } from "@/components/game/stone-colors";
import { getLocation } from "@/lib/engine/data";
import { HAND_LIMIT, totalTokens, type PendingAction, type TokenColor, type TokenCounts } from "@/lib/engine/types";

/** The only colors a player may ever return (rulebook: green/Time can never be returned). */
const RETURNABLE_COLORS: TokenColor[] = ["mind", "space", "soul", "power", "reality", "shield"];

interface PendingActionModalsProps {
  pending: PendingAction | null;
  viewerTokens: TokenCounts;
  submitting?: boolean;
  /** When the turn runs out (device clock), and its full length; null when untimed. */
  turnEndsAt: number | null;
  turnSeconds: number | null;
  /** The return-tokens popup can be closed to look at the board, and reopened. */
  returnOpen: boolean;
  onReturnOpenChange: (open: boolean) => void;
  onSubmitReturnTokens: (tokens: Partial<Record<TokenColor, number>>) => void;
  /** The full set of tokens tapped to give back, or null while the pick is short; so a timeout can send it. */
  onReturnPicked?: (tokens: Partial<Record<TokenColor, number>> | null) => void;
  onSubmitChooseLocation: (locationId: string) => void;
}

/**
 * Modal(s) for the two `PendingAction` kinds (ARCHITECTURE.md's "pending
 * sub-moves"). Per the API contract, `pending` is only ever non-null for
 * the viewer's own seat, so this always blocks the *viewer's* input until
 * resolved. Returning tokens can be closed to look at the board and
 * reopened from the turn button; choosing a Location cannot be closed.
 */
export function PendingActionModals({
  pending,
  viewerTokens,
  submitting,
  turnEndsAt,
  turnSeconds,
  returnOpen,
  onReturnOpenChange,
  onSubmitReturnTokens,
  onReturnPicked,
  onSubmitChooseLocation,
}: PendingActionModalsProps) {
  // The popups cover the player's card, so they carry the turn's timer themselves.
  const timer = <TurnTimer endsAt={turnEndsAt} seconds={turnSeconds} className="size-9 shrink-0 text-sm" />;
  return (
    <>
      <ReturnTokensDialog
        pending={pending?.type === "RETURN_TOKENS" ? pending : null}
        viewerTokens={viewerTokens}
        submitting={submitting}
        timer={timer}
        open={returnOpen}
        onOpenChange={onReturnOpenChange}
        onSubmit={onSubmitReturnTokens}
        onPicked={onReturnPicked}
      />
      <ChooseLocationDialog
        pending={pending?.type === "CHOOSE_LOCATION" ? pending : null}
        submitting={submitting}
        timer={timer}
        onSubmit={onSubmitChooseLocation}
      />
    </>
  );
}

function ReturnTokensDialog({
  pending,
  viewerTokens,
  submitting,
  timer,
  open,
  onOpenChange,
  onSubmit,
  onPicked,
}: {
  pending: { type: "RETURN_TOKENS"; mustReturn: number } | null;
  viewerTokens: TokenCounts;
  submitting?: boolean;
  timer: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (tokens: Partial<Record<TokenColor, number>>) => void;
  onPicked?: (tokens: Partial<Record<TokenColor, number>> | null) => void;
}) {
  return (
    <Dialog open={Boolean(pending) && open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(var(--screen-h)*0.9)] gap-3 overflow-y-auto sm:max-w-xl">
        {pending ? (
          // Keyed so each new request starts with nothing picked.
          <ReturnTokens
            key={`${pending.mustReturn}-${totalTokens(viewerTokens)}`}
            mustReturn={pending.mustReturn}
            tokens={viewerTokens}
            submitting={submitting}
            timer={timer}
            onSubmit={onSubmit}
            onPicked={onPicked}
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
  timer,
  onSubmit,
  onPicked,
}: {
  mustReturn: number;
  tokens: TokenCounts;
  submitting?: boolean;
  timer?: ReactNode;
  onSubmit: (tokens: Partial<Record<TokenColor, number>>) => void;
  onPicked?: (tokens: Partial<Record<TokenColor, number>> | null) => void;
}) {
  const [returning, setReturning] = useState<Partial<Record<TokenColor, number>>>({});
  const picked = Object.values(returning).reduce((sum, n) => sum + (n ?? 0), 0);
  const left = mustReturn - picked;
  // Closing the popup, however it closes, takes the pick with it.
  useEffect(() => {
    onPicked?.(left === 0 ? returning : null);
    return () => onPicked?.(null);
  }, [left, returning, onPicked]);
  const move = (color: TokenColor, by: number) =>
    setReturning((prev) => ({ ...prev, [color]: (prev[color] ?? 0) + by }));

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          {timer}
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
        <Pill tone="red" className="flex-1" disabled={left !== 0 || submitting} onClick={() => onSubmit(returning)}>
          {submitting ? "Sending…" : "Return the excess tokens"}
        </Pill>
      </DialogFooter>
    </>
  );
}

function ChooseLocationDialog({
  pending,
  submitting,
  timer,
  onSubmit,
}: {
  pending: { type: "CHOOSE_LOCATION"; options: string[] } | null;
  submitting?: boolean;
  timer: ReactNode;
  onSubmit: (locationId: string) => void;
}) {
  return (
    <Dialog open={Boolean(pending)}>
      <DialogContent
        className="max-h-[calc(var(--screen-h)*0.9)] overflow-y-auto sm:max-w-md"
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Keyed so a new choice starts with nothing picked. */}
        {pending ? <ChooseLocation key={pending.options.join()} options={pending.options} submitting={submitting} timer={timer} onSubmit={onSubmit} /> : null}
      </DialogContent>
    </Dialog>
  );
}

/** Tap a tile to pick it, then confirm; a mis-tap on a phone can be changed. */
function ChooseLocation({
  options,
  submitting,
  timer,
  onSubmit,
}: {
  options: string[];
  submitting?: boolean;
  timer: ReactNode;
  onSubmit: (locationId: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          {timer}
          Choose a Location
        </DialogTitle>
        <DialogDescription>You qualify for more than one Location tile. Tap the one to claim, then confirm.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-wrap justify-center gap-3">
        {options.map((id) => (
          <LocationTile
            key={id}
            className={cn("w-28 transition", picked === id ? "scale-105 ring-4 ring-gold-400" : picked ? "opacity-50" : "")}
            location={getLocation(id)}
            selectable
            onClick={() => setPicked(id)}
          />
        ))}
      </div>

      <DialogFooter>
        <Pill tone="gold" className="flex-1" disabled={!picked || submitting} onClick={() => picked && onSubmit(picked)}>
          {submitting ? "Sending…" : "Claim it"}
        </Pill>
      </DialogFooter>
    </>
  );
}
