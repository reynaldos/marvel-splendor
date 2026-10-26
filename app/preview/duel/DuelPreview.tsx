"use client";

import { useMemo, useState } from "react";

import { DuelBoard } from "@/components/duel/Board";
import { DuelChoices } from "@/components/duel/DuelChoices";
import type { DuelStaged } from "@/components/duel/staged";
import { TracedMoveProvider } from "@/components/game/traced-move";
import { chooseDuelBotMove } from "@/lib/bot/duel-policy";
import { applyDuelMove } from "@/lib/duel/apply";
import { allLines } from "@/lib/duel/board";
import { createDuel } from "@/lib/duel/setup";
import type { DuelPending } from "@/lib/duel/types";
import { redactDuel } from "@/lib/duel/view";

import { PreviewMenu } from "../PreviewBar";

const PLAYERS = [
  { seat: 0, isBot: false, name: "You", avatarUrl: null },
  { seat: 1, isBot: true, name: "Rival", avatarUrl: null },
];

/** The choices a turn can leave, to look at by `?show=`. */
export const SHOWS: Record<string, DuelPending> = {
  PickToken: { type: "PICK_TOKEN", reason: "privilege" },
  PickColorToken: { type: "PICK_TOKEN", color: "reality", reason: "token" },
  Steal: { type: "PICK_OPPONENT_TOKEN" },
  Join: { type: "PICK_JOIN_COLOR", cardId: "d1-26" },
  Royal: { type: "PICK_ROYAL" },
};

/**
 * The real Duel board on a made-up table: a seeded game the bots have played a few turns of, seen from seat 0
 * on its turn, with a line of three staged. Nothing is sent anywhere.
 */
export function DuelPreview({ show }: { show?: string }) {
  const view = useMemo(() => {
    let state = createDuel("duel-preview", { botDifficulty: "normal" });
    for (let i = 0; i < 12 && state.status === "active"; i++) state = applyDuelMove(state, state.currentSeat, chooseDuelBotMove(state, state.currentSeat));
    // Seat 0 on turn, holding a Privilege and a reserved card, with a pending choice when asked for.
    state = { ...state, currentSeat: 0, pending: (show ? SHOWS[show] : null) ?? null };
    state.players[0] = { ...state.players[0], privileges: Math.max(1, state.players[0].privileges) };
    state.players[1] = { ...state.players[1], tokens: { ...state.players[1].tokens, reality: 2 } };
    if (state.players[0].reserved.length === 0) state.players[0].reserved = [{ cardId: state.decks[2][0], blind: false }];
    return redactDuel(state, 0);
  }, [show]);
  const [staged, setStaged] = useState<DuelStaged | null>(() => {
    const line = allLines(view.board).find((l) => l.length === 3);
    return line ? { kind: "line", spaces: line } : null;
  });
  const noop = () => {};

  return (
    <div className="game-board theme-cosmos dark relative flex w-full items-end overflow-hidden bg-cosmos">
      <TracedMoveProvider value={null}>
        <DuelBoard
          view={view}
          turnEndsAt={null}
          players={PLAYERS}
          staged={staged}
          disabled={Boolean(view.pending)}
          submitting={false}
          bubbles={{}}
          menu={<PreviewMenu />}
          onToggleSpace={(space) =>
            setStaged((prev) => {
              const spaces = prev?.kind === "line" ? prev.spaces : [];
              const next = spaces.includes(space) ? spaces.filter((s) => s !== space) : [...spaces, space];
              return next.length ? { kind: "line", spaces: next } : null;
            })
          }
          onStageReserveDeck={(level) => setStaged({ kind: "reserveDeck", level })}
          onReservePyramid={noop}
          onBuy={noop}
          onSpendPrivilege={noop}
          onRefill={noop}
          onConfirm={noop}
        />
      </TracedMoveProvider>
      <DuelChoices
        view={view}
        pending={view.pending && view.pending.type !== "RETURN_TOKENS" ? view.pending : null}
        open
        onOpenChange={noop}
        submitting={false}
        turnEndsAt={null}
        onPickToken={noop}
        onPickOpponentToken={noop}
        onPickJoinColor={noop}
        onPickRoyal={noop}
      />
    </div>
  );
}
