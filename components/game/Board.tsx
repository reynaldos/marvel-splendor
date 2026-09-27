"use client";

import { AvengersTile } from "@/components/game/AvengersTile";
import { CardMarket } from "@/components/game/CardMarket";
import { EndTurnBar } from "@/components/game/EndTurnBar";
import { HandTray } from "@/components/game/HandTray";
import { LocationTile } from "@/components/game/LocationTile";
import { PlayerPlaque } from "@/components/game/PlayerPlaque";
import { ReserveTray } from "@/components/game/ReserveTray";
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
  players: PlayerInfo[];
  staged: StagedAction | null;
  /** True while resolving a pending sub-move, submitting, or replaying bot moves. */
  disabled: boolean;
  submitting: boolean;
  banterBySeat: Record<number, string | null>;
  onStageTokenColor: (color: Stone) => void;
  onUnstageTokenColor: (color: Stone) => void;
  onStageReserveMarket: (level: CardLevel, cardId: string) => void;
  onStageReserveDeck: (level: CardLevel) => void;
  onStageRecruit: (from: "market" | "reserve", cardId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Top-level board layout (ARCHITECTURE.md §6): left = 3 CardMarket rows
 * (III/II/I), right rail = TokenBank + Locations + Avengers tile, plaques
 * top (opponents) / bottom (viewer), bottom-center HandTray, bottom-right
 * EndTurnBar. Purely props-in — all fetching/mutation lives in
 * GameBoardClient; this component only wires tap input to the staging
 * callbacks it's handed.
 */
export function Board({
  view,
  players,
  staged,
  disabled,
  submitting,
  banterBySeat,
  onStageTokenColor,
  onUnstageTokenColor,
  onStageReserveMarket,
  onStageReserveDeck,
  onStageRecruit,
  onConfirm,
  onCancel,
}: BoardProps) {
  const viewerSeat = view.viewerSeat;
  const viewer = view.players.find((p) => p.seat === viewerSeat);
  const others = view.players.filter((p) => p.seat !== viewerSeat).sort((a, b) => a.seat - b.seat);

  function nameForSeat(seat: number): string {
    return players.find((p) => p.seat === seat)?.name ?? `Seat ${seat}`;
  }

  if (!viewer) return null;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {others.length > 0 ? (
        <div className="flex flex-wrap items-start justify-center gap-4">
          {others.map((p) => (
            <div key={p.seat} className="flex flex-col items-center gap-1.5">
              <PlayerPlaque
                player={p}
                name={nameForSeat(p.seat)}
                isBot={players.find((pl) => pl.seat === p.seat)?.isBot ?? false}
                isViewer={false}
                isCurrentTurn={view.currentSeat === p.seat}
                settings={view.settings}
                turnKey={`${view.currentSeat}-${view.moveCount}`}
                banterText={banterBySeat[p.seat] ?? null}
              />
              <ReserveTray reserved={p.reserved} isViewer={false} size="sm" />
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-4 lg:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-2">
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

        <div className="flex w-full flex-col gap-3 lg:w-64">
          <TokenBank
            supply={view.supply}
            staged={staged}
            disabled={disabled}
            onStageTokenColor={onStageTokenColor}
          />
          <div className="flex flex-col gap-2">
            <h3 className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
              Locations
            </h3>
            {view.locations.map((id) => (
              <LocationTile key={id} location={getLocation(id)} />
            ))}
          </div>
          <AvengersTile
            avengersHolder={view.avengersHolder}
            players={view.players}
            nameForSeat={nameForSeat}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 border-t border-border pt-3">
        <div className="flex flex-col items-start gap-1.5">
          <PlayerPlaque
            player={viewer}
            name={nameForSeat(viewerSeat)}
            isBot={false}
            isViewer
            isCurrentTurn={view.currentSeat === viewerSeat}
            settings={view.settings}
            turnKey={`${view.currentSeat}-${view.moveCount}`}
            banterText={banterBySeat[viewerSeat] ?? null}
          />
          <ReserveTray
            reserved={viewer.reserved}
            isViewer
            viewerTokens={viewer.tokens}
            viewerBonuses={viewer.bonuses}
            staged={staged}
            disabled={disabled}
            onStageRecruit={(cardId) => onStageRecruit("reserve", cardId)}
          />
        </div>

        <HandTray
          tokens={viewer.tokens}
          stagedColors={staged?.kind === "tokens" ? staged.colors : []}
          disabled={disabled}
          onUnstageTokenColor={onUnstageTokenColor}
        />

        <EndTurnBar staged={staged} disabled={disabled} submitting={submitting} onConfirm={onConfirm} onCancel={onCancel} />
      </div>
    </div>
  );
}
