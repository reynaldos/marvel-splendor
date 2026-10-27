"use client";

import type { ReactNode } from "react";

import { ASSETS, AssetImage } from "@/components/game/assets";
import { CardMarket } from "@/components/game/CardMarket";
import type { Bubbles } from "@/components/game/ChatBubble";
import { EndTurnBar } from "@/components/game/EndTurnBar";
import { HandTray, StagedTokens } from "@/components/game/HandTray";
import { PlayerPlaque } from "@/components/game/PlayerPlaque";
import { ReserveTray } from "@/components/game/ReserveTray";
import { ReservedCards } from "@/components/game/ReservedCards";
import { TeamView } from "@/components/game/TeamView";
import { TileRail } from "@/components/game/TileRail";
import { Zoomable } from "@/components/game/Zoomable";
import { TokenBank } from "@/components/game/TokenBank";
import { HAND_LIMIT, totalTokens, type CardLevel, type Stone } from "@/lib/engine/types";
import type { RedactedGameState } from "@/lib/game-view";
import { tokensAfter, type StagedAction } from "@/components/game/staged-action";

interface PlayerInfo {
  seat: number;
  isBot: boolean;
  userId: string | null;
  avatarUrl: string | null;
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
  /** What each seat has just sent to the table. */
  bubbles: Bubbles;
  /** Top-right menu button (owned by GameBoardClient). */
  menu: ReactNode;
  /** The chat button beside the viewer's name; left out where nothing can be sent. */
  chat?: ReactNode;
  onStageTokenColor: (color: Stone) => void;
  onUnstageTokenColor: (color: Stone) => void;
  onStageReserveMarket: (level: CardLevel, cardId: string) => void;
  onStageReserveDeck: (level: CardLevel) => void;
  onStageRecruit: (from: "market" | "reserve", cardId: string) => void;
  onConfirm: () => void;
  /** Set while the viewer is, or is about to be, over the token limit; opens the popup to give some back. */
  onReturn?: () => void;
}

const TRAY_PANEL = "rounded-t-2xl rounded-b-none bg-card";

/** Everyone but the viewer, in the order their turns come after the viewer's. */
export function afterViewer<T extends { seat: number }>(players: T[], viewerSeat: number): T[] {
  const turnsAway = (seat: number) => (seat - viewerSeat + players.length) % players.length;
  return players.filter((p) => p.seat !== viewerSeat).sort((a, b) => turnsAway(a.seat) - turnsAway(b.seat));
}

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
  bubbles,
  menu,
  chat,
  onStageTokenColor,
  onUnstageTokenColor,
  onStageReserveMarket,
  onStageReserveDeck,
  onStageRecruit,
  onConfirm,
  onReturn,
}: BoardProps) {
  const viewerSeat = view.viewerSeat;
  const viewer = view.players.find((p) => p.seat === viewerSeat);
  const others = afterViewer(view.players, viewerSeat);
  const stagedColors = staged?.kind === "tokens" ? staged.colors : [];
  // Once the game is over nobody is on turn, so no plaque glows or counts down.
  const turnSeat = view.status === "active" ? view.currentSeat : null;
  // The win tile's art has its number printed on it; other targets get text.
  const winTile = ASSETS.winTile?.points === view.settings.targetPoints ? ASSETS.winTile : null;
  const headerHeight = winTile ? 10 : 7;

  const avatarForSeat = (seat: number) => players.find((p) => p.seat === seat)?.avatarUrl ?? null;
  function nameForSeat(seat: number): string {
    return players.find((p) => p.seat === seat)?.name ?? `Seat ${seat}`;
  }

  if (!viewer) return null;

  return (
    <div className="flex h-100 w-full flex-col gap-2 p-2 pb-0">
      <div className="flex min-h-0 flex-1 justify-between gap-2">
        <div className="flex flex-col gap-1.5">
          {others.map((p) => (
            // Tapping a plaque shows that player's team; its reserved cards open on their own.
            <TeamView key={p.seat} owner={`${nameForSeat(p.seat)}'s`} cardIds={p.cards}>
              <PlayerPlaque
                player={p}
                name={nameForSeat(p.seat)}
                avatarUrl={avatarForSeat(p.seat)}
                startedGame={view.startingSeat === p.seat}
                isCurrentTurn={turnSeat === p.seat}
                turnEndsAt={turnEndsAt}
                turnSeconds={view.settings.turnTimeSeconds}
                bubble={bubbles[p.seat]}
                // Room above the card for its tab.
                className="mt-7"
                beside={
                  <ReserveTray
                    reserved={p.reserved}
                    seat={p.seat}
                    ownerName={nameForSeat(p.seat)}
                    className="gap-0.5"
                    cardClassName="w-4 rounded-sm"
                  />
                }
              />
            </TeamView>
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

        <TokenBank supply={view.supply} staged={staged} disabled={disabled} onStageTokenColor={onStageTokenColor} onUnstageTokenColor={onUnstageTokenColor} />

        <div className="flex w-32 flex-col gap-1">
          <div
            className="flex shrink-0 items-center justify-end gap-2"
            style={{ height: `calc(var(--spacing) * ${headerHeight})` }}
          >
            {winTile ? (
              <Zoomable
                label={`Show the win tile: ${winTile.points} points to win`}
                className="relative aspect-[1404/688] h-full overflow-hidden rounded-md ring-1 ring-foreground/10"
                zoomed={
                  <div className="relative aspect-[1404/688] w-150 overflow-hidden rounded-xl">
                    <AssetImage src={winTile.image} alt={`${winTile.points} points to win`} sizes="75vw" />
                  </div>
                }
              >
                <AssetImage src={winTile.image} alt={`${winTile.points} points to win`} sizes="12vw" />
              </Zoomable>
            ) : (
              <span className="text-sm font-bold" title="Points needed to win">
                {view.settings.targetPoints} pts to win
              </span>
            )}
            {menu}
          </div>
          <TileRail
            locations={view.locations}
            avengersHolder={view.avengersHolder}
            players={view.players}
            nameForSeat={nameForSeat}
            height={74 - headerHeight}
          />
        </div>
      </div>

      {/* Panels run off the bottom edge, like a physical tray. */}
      <div className="flex h-20 shrink-0 items-stretch gap-2">
        <PlayerPlaque
          player={viewer}
          name={nameForSeat(viewerSeat)}
          avatarUrl={avatarForSeat(viewerSeat)}
          startedGame={view.startingSeat === viewerSeat}
          isCurrentTurn={turnSeat === viewerSeat}
          turnEndsAt={turnEndsAt}
          turnSeconds={view.settings.turnTimeSeconds}
          bubble={bubbles[viewerSeat]}
          hideTags
          // The button sits on the corner of the name's tab, left of the points, and what is
          // sent shows to the right of it, above the points.
          tabExtra={chat ? <div className="absolute -top-2 -right-2">{chat}</div> : null}
          // Named after the tray's corners, or they undo it.
          className={`w-40 ${TRAY_PANEL} rounded-tl-none [--tab:calc(var(--spacing)*8)]`}
          openBottom
          tabClassName="w-32"
          bubbleClassName="top-auto bottom-full left-32 mb-4 ml-4"
        >
          <StagedTokens colors={stagedColors} disabled={disabled} onUnstageTokenColor={onUnstageTokenColor} />
        </PlayerPlaque>

        <div className={`mx-auto flex shrink-0 items-center gap-2 px-1.5 ring-1 ring-foreground/10 ${TRAY_PANEL}`}>
          <HandTray tokens={viewer.tokens} bonuses={viewer.bonuses} cards={viewer.cards} tags={viewer.tags} stagedCount={stagedColors.length} />
          <ReservedCards
            reserved={viewer.reserved}
            viewerTokens={viewer.tokens}
            viewerBonuses={viewer.bonuses}
            selected={staged?.kind === "recruit" && staged.from === "reserve"}
            disabled={disabled}
            onStageRecruit={(cardId) => onStageRecruit("reserve", cardId)}
          />
        </div>

        <EndTurnBar
          hasStaged={staged !== null}
          overLimit={totalTokens(tokensAfter(staged, viewer.tokens, view.supply)) > HAND_LIMIT}
          disabled={disabled}
          submitting={submitting}
          onConfirm={onConfirm}
          onReturn={onReturn}
        />
      </div>
    </div>
  );
}
