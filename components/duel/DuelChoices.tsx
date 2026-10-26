"use client";

import { useState, type ReactNode } from "react";
import { cn } from "cn";

import { DuelCardView, RoyalCard } from "@/components/duel/DuelCard";
import { Grid, Reminders } from "@/components/duel/TokenBoard";
import { tokenMeta } from "@/components/game/stone-colors";
import { TokenChip } from "@/components/game/TokenChip";
import { TurnTimer } from "@/components/game/TurnTimer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getDuelCard } from "@/lib/duel/data";
import { GOLD, STONES, TOKEN_COLORS, type DuelPending, type Stone, type TokenColor } from "@/lib/duel/types";
import type { DuelView } from "@/lib/duel/view";

/** Every pending choice but the token return, which the Marvel popup handles. */
type Choice = Exclude<DuelPending, { type: "RETURN_TOKENS" }>;

interface Picks {
  onPickToken: (space: number) => void;
  onPickOpponentToken: (color: TokenColor) => void;
  onPickJoinColor: (color: Stone) => void;
  onPickRoyal: (royalId: string) => void;
}

interface DuelChoicesProps extends Picks {
  view: DuelView;
  pending: Choice | null;
  /** Closed to look at the board; the turn button opens it again. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  turnEndsAt: number | null;
}

const TITLES: Record<Choice["type"], [string, string]> = {
  PICK_TOKEN: ["Take a stone", "Tap any one stone on the board, then confirm. S.H.I.E.L.D. cannot be taken this way."],
  PICK_OPPONENT_TOKEN: ["Take a stone from your rival", "Tap one of the stones they hold, then confirm. It goes into your hand. S.H.I.E.L.D. cannot be taken."],
  PICK_JOIN_COLOR: ["Which color does the wild card join?", "It counts as one more card of that color from now on, and stays there."],
  PICK_ROYAL: ["Claim a Location", "Your Avengers badges have earned one. Each gives points, some a power as well."],
};

/** The popups for the choices a Duel turn can leave. Any can be closed to look at the board, and reopened from the turn button. */
export function DuelChoices({ view, pending, open, onOpenChange, submitting, turnEndsAt, ...picks }: DuelChoicesProps) {
  return (
    <Dialog open={pending !== null && open} onOpenChange={onOpenChange}>
      <DialogContent className="theme-cosmos dark max-h-[calc(var(--screen-h)*0.9)] gap-4 overflow-y-auto border-2 border-gold-400 sm:max-w-fit" showCloseButton={false}>
        {pending ? <ChoiceBody key={`${pending.type}-${view.moveCount}`} view={view} pending={pending} submitting={submitting} turnEndsAt={turnEndsAt} onClose={() => onOpenChange(false)} {...picks} /> : null}
      </DialogContent>
    </Dialog>
  );
}

/** One choice's title, timer, body and buttons; keyed by the choice so a pick never carries over. */
function ChoiceBody({
  view,
  pending,
  submitting,
  turnEndsAt,
  onClose,
  onPickToken,
  onPickOpponentToken,
  onPickJoinColor,
  onPickRoyal,
}: Picks & { view: DuelView; pending: Choice; submitting: boolean; turnEndsAt: number | null; onClose: () => void }) {
  const [picked, setPicked] = useState<number | Stone | null>(null);
  const opponent = view.players[1 - view.viewerSeat];
  const viewer = view.players[view.viewerSeat];
  const [title, description] = TITLES[pending.type];

  let body: ReactNode = null;
  // Set for the choices that take a pick and a confirm; null until something is picked.
  let confirm: (() => void) | null | undefined;
  if (pending.type === "PICK_TOKEN") {
    const wanted = pending.color;
    body = (
      // The same frame as the board opened large, so the stones sit where the player knows them.
      <div className="flex items-start gap-5 rounded-2xl bg-cosmos-950/90 p-4 ring-2 ring-gold-400">
        <Grid
          board={view.board}
          size="lg"
          selected={typeof picked === "number" ? [picked] : []}
          onTap={(space) => setPicked(space)}
          canTap={(space) => view.board[space] !== GOLD && (!wanted || view.board[space] === wanted)}
        />
        <Reminders className="my-auto w-56 flex-col" labeled />
      </div>
    );
    confirm = typeof picked === "number" ? () => onPickToken(picked) : null;
  } else if (pending.type === "PICK_OPPONENT_TOKEN") {
    // Every color the rival could hold, large; the ones they have none of are dimmed and cannot be picked.
    body = (
      <div className="flex justify-center gap-3 rounded-2xl bg-cosmos-950/90 p-4 ring-2 ring-gold-400">
        {TOKEN_COLORS.filter((t) => t !== GOLD).map((t) => {
          const held = opponent.tokens[t];
          return (
            <button
              key={t}
              type="button"
              disabled={submitting || held === 0}
              onClick={() => setPicked(t as Stone)}
              className={cn("relative flex flex-col items-center gap-2 rounded-xl p-2 ring-2", picked === t ? "bg-cosmos-700 ring-gold-400" : "ring-transparent hover:bg-cosmos-700", held === 0 && "opacity-30 hover:bg-transparent")}
              aria-label={`Take a ${tokenMeta(t).label} stone`}
            >
              <span className="relative">
                <TokenChip color={t} className="size-16 shadow-lg" />
                <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-white text-xs font-black text-black ring-1 ring-black">{held}</span>
              </span>
              <span className={cn("fs-2xs font-bold", tokenMeta(t).text)}>{tokenMeta(t).label}</span>
            </button>
          );
        })}
      </div>
    );
    confirm = typeof picked === "string" ? () => onPickOpponentToken(picked) : null;
  } else if (pending.type === "PICK_JOIN_COLOR") {
    // Each color the player owns, with the cards and points it already holds.
    const colorOf = (c: (typeof viewer.cards)[number]) => c.joined ?? getDuelCard(c.cardId).bonus;
    body = (
      <div className="flex flex-wrap justify-center gap-3">
        {STONES.filter((s) => viewer.bonuses[s] > 0).map((s) => {
          const cards = viewer.cards.filter((c) => colorOf(c) === s);
          const points = cards.reduce((sum, c) => sum + getDuelCard(c.cardId).points, 0);
          return (
            <button
              key={s}
              type="button"
              disabled={submitting}
              onClick={() => setPicked(s)}
              className={cn("flex flex-col items-center gap-2 rounded-xl p-3 ring-2", picked === s ? "bg-cosmos-700 ring-gold-400" : "ring-transparent hover:bg-cosmos-700")}
              aria-label={`Join ${tokenMeta(s).label}`}
            >
              <TokenChip color={s} size="lg" />
              <span className={cn("fs-2xs font-bold", tokenMeta(s).text)}>
                {viewer.bonuses[s]} bonus · {points} pts
              </span>
              <span className="flex gap-1">
                {cards.map((c) => (
                  <DuelCardView key={c.cardId} cardId={c.cardId} className="w-10 rounded-sm" />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    );
    confirm = typeof picked === "string" ? () => onPickJoinColor(picked) : null;
  } else {
    body = (
      <div className="flex flex-wrap justify-center gap-3">
        {view.royals.map((id) => (
          <RoyalCard key={id} royalId={id} className="w-28" selectable onClick={() => !submitting && onPickRoyal(id)} />
        ))}
      </div>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <TurnTimer endsAt={turnEndsAt} seconds={view.settings.turnTimeSeconds} className="size-9 shrink-0 text-sm" />
          {title}
        </DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {body}
      <DialogFooter className="sm:justify-between">
        <Button type="button" variant="secondary" onClick={onClose}>
          View board
        </Button>
        {confirm !== undefined ? (
          <Button type="button" disabled={submitting || !confirm} onClick={() => confirm?.()}>
            {submitting ? "Sending…" : "Confirm"}
          </Button>
        ) : null}
      </DialogFooter>
    </>
  );
}
