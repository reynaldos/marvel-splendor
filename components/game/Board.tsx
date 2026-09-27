"use client";

import type { ReactNode } from "react";

import { AvengersTile } from "@/components/game/AvengersTile";
import { CardMarket } from "@/components/game/CardMarket";
import { EndTurnBar } from "@/components/game/EndTurnBar";
import { HandTray, StagedTokens } from "@/components/game/HandTray";
import { LocationTile } from "@/components/game/LocationTile";
import { PlayerPlaque } from "@/components/game/PlayerPlaque";
import { ReserveTray } from "@/components/game/ReserveTray";
import { ReservedCards } from "@/components/game/ReservedCards";
import { TokenBank } from "@/components/game/TokenBank";
import { getLocation } from "@/lib/engine/data";
import type { CardLevel, Stone } from "@/lib/engine/types";
import type { RedactedGameState } from "@/lib/game-view";
import type { StagedAction } from "@/components/game/staged-action";

interface PlayerInfo {
  seat: number;
  isBot: boolean;
  userId: string | null;
  name: string;
}

interface BoardProps {
  view: RedactedGameState;
  /** When the current turn runs out (device clock); null when untimed. */
  turnEndsAt: number | null;
  players: PlayerInfo[];
  staged: StagedAction | null;
  /** True while resolving a pending sub-move, submitting, or replaying bot moves. */
  disabled: boolean;
  submitting: boolean;
  banterBySeat: Record<number, string | null>;
  /** Top-right menu button (owned by GameBoardClient). */
  menu: ReactNode;
  onStageTokenColor: (color: Stone) => void;
  onUnstageTokenColor: (color: Stone) => void;
  onStageReserveMarket: (level: CardLevel, cardId: string) => void;
  onStageReserveDeck: (level: CardLevel) => void;
  onStageRecruit: (from: "market" | "reserve", cardId: string) => void;
  onConfirm: () => void;
}

const TRAY_PANEL = "rounded-t-2xl rounded-b-none bg-card";

/**
 * Top-level board layout (ARCHITECTURE.md §6), built for a landscape phone:
 * a canvas 100 spacing steps tall that never scrolls (see `.game-board` in
 * globals.css for how a step scales with the viewport).
 *
 *   opponents | III/II/I market rows | token bank | target, menu, tiles
 *   ----------+----------------------+------------+--------------------
 *   taking    | your tray: n/10, holdings,        | End Turn
 *   this turn | reserved-card fan                 |
 *
 * Purely props-in — all fetching/mutation lives in GameBoardClient; this
 * component only wires tap input to the staging callbacks it's handed.
 */
export function Board({
  view,
  turnEndsAt,
  players,
  staged,
  disabled,
  submitting,
  banterBySeat,
  menu,
  onStageTokenColor,
  onUnstageTokenColor,
  onStageReserveMarket,
  onStageReserveDeck,
  onStageRecruit,
  onConfirm,
}: BoardProps) {
  const viewerSeat = view.viewerSeat;
  const viewer = view.players.find((p) => p.seat === viewerSeat);
  const others = view.players.filter((p) => p.seat !== viewerSeat).sort((a, b) => a.seat - b.seat);
  const stagedColors = staged?.kind === "tokens" ? staged.colors : [];
  // Square tiles share one column: 63 steps of height (a 1-step gap between
  // each), capped at a market card's width so a 2-player game isn't oversized.
  const tileCount = view.locations.length + 1;
  const tileSize = Math.min(16, Math.floor((63 - (tileCount - 1)) / tileCount));

  function nameForSeat(seat: number): string {
    return players.find((p) => p.seat === seat)?.name ?? `Seat ${seat}`;
  }

  if (!viewer) return null;

  return (
    <div className="flex h-100 w-full flex-col gap-2 p-2 pb-0">
      <div className="flex min-h-0 flex-1 justify-between gap-2">
        <div className="flex flex-col gap-1.5">
          {others.map((p) => (
            <PlayerPlaque
              key={p.seat}
              player={p}
              name={nameForSeat(p.seat)}
              isCurrentTurn={view.currentSeat === p.seat}
              turnEndsAt={turnEndsAt}
              banterText={banterBySeat[p.seat] ?? null}
              headerExtra={
                <ReserveTray reserved={p.reserved} className="gap-0.5" cardClassName="h-6 w-4 rounded-sm" />
              }
            />
          ))}
        </div>

        <div className="flex flex-col justify-between">
          {([3, 2, 1] as CardLevel[]).map((level) => (
            <CardMarket
              key={level}
              level={level}
              slots={view.market[level]}
              deckCount={view.deckCounts[level]}
              viewerTokens={viewer.tokens}
              viewerBonuses={viewer.bonuses}
              viewerReservedCount={viewer.reserved.length}
              staged={staged}
              disabled={disabled}
              onStageReserveMarket={onStageReserveMarket}
              onStageReserveDeck={onStageReserveDeck}
              onStageRecruit={(cardId) => onStageRecruit("market", cardId)}
            />
          ))}
        </div>

        <TokenBank supply={view.supply} staged={staged} disabled={disabled} onStageTokenColor={onStageTokenColor} />

        <div className="flex w-32 flex-col gap-1">
          <div className="flex h-7 items-center justify-end gap-2">
            <span className="text-sm font-bold" title="Points needed to win">
              {view.settings.targetPoints} pts to win
            </span>
            {menu}
          </div>
          <div
            className="mx-auto flex min-h-0 flex-1 flex-col items-center justify-center gap-1"
            style={{ width: `calc(var(--spacing) * ${tileSize})` }}
          >
            {view.locations.map((id) => (
              <LocationTile key={id} location={getLocation(id)} />
            ))}
            <AvengersTile avengersHolder={view.avengersHolder} players={view.players} nameForSeat={nameForSeat} />
          </div>
        </div>
      </div>

      {/* Panels run off the bottom edge, like a physical tray. */}
      <div className="flex h-24 shrink-0 items-stretch gap-2">
        <PlayerPlaque
          player={viewer}
          name={nameForSeat(viewerSeat)}
          isCurrentTurn={view.currentSeat === viewerSeat}
          turnEndsAt={turnEndsAt}
          banterText={banterBySeat[viewerSeat] ?? null}
          hideTags
          className={`w-40 ${TRAY_PANEL}`}
        >
          <StagedTokens colors={stagedColors} disabled={disabled} onUnstageTokenColor={onUnstageTokenColor} />
        </PlayerPlaque>

        <div className={`flex min-w-0 flex-1 items-center justify-between gap-2 px-1.5 ring-1 ring-foreground/10 ${TRAY_PANEL}`}>
          <HandTray tokens={viewer.tokens} bonuses={viewer.bonuses} tags={viewer.tags} stagedCount={stagedColors.length} />
          <ReservedCards
            reserved={viewer.reserved}
            viewerTokens={viewer.tokens}
            viewerBonuses={viewer.bonuses}
            selected={staged?.kind === "recruit" && staged.from === "reserve"}
            disabled={disabled}
            onStageRecruit={(cardId) => onStageRecruit("reserve", cardId)}
          />
        </div>

        <EndTurnBar hasStaged={staged !== null} disabled={disabled} submitting={submitting} onConfirm={onConfirm} />
      </div>
    </div>
  );
}
