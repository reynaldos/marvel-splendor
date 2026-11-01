"use client";

import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import { DuelCard, DuelCardView, RoyalCard } from "@/components/duel/DuelCard";
import { artIdsOf, duelArt } from "@/components/duel/duel-art";
import type { DuelStaged } from "@/components/duel/staged";
import { HeldScrolls, Privilege, TokenBoard, WinTile } from "@/components/duel/TokenBoard";
import { ASSETS, AssetImage, AvengersIcon } from "@/components/game/assets";
import type { Bubbles } from "@/components/game/ChatBubble";
import { EndTurnBar } from "@/components/game/EndTurnBar";
import { HandTray } from "@/components/game/HandTray";
import { Holdings, PlayerPlaque } from "@/components/game/PlayerPlaque";
import { ReservedFan } from "@/components/game/ReservedCards";
import { TeamView } from "@/components/game/TeamView";
import { TokenChip } from "@/components/game/TokenChip";
import { useTracedMove } from "@/components/game/traced-move";
import { Zoomable } from "@/components/game/Zoomable";
import { useTabletLayout } from "@/components/use-tablet-layout";
import { isLine } from "@/lib/duel/board";
import { ROYAL_CARDS } from "@/lib/duel/data";
import { canBuy, colorPointsOf } from "@/lib/duel/rules";
import { GOLD, HAND_LIMIT, MAX_RESERVED, totalTokens, type CardLevel, type DuelPlayer } from "@/lib/duel/types";
import type { DuelView, DuelViewPlayer, DuelViewReserved } from "@/lib/duel/view";
import type { RedactedPlayerState } from "@/lib/game-view";
import { cn } from "cn";

interface PlayerInfo {
  seat: number;
  isBot: boolean;
  name: string;
  avatarUrl: string | null;
}

interface DuelBoardProps {
  view: DuelView;
  turnEndsAt: number | null;
  players: PlayerInfo[];
  staged: DuelStaged | null;
  /** True while a choice is pending, a move is being sent, or a bot is playing. */
  disabled: boolean;
  submitting: boolean;
  bubbles: Bubbles;
  menu: ReactNode;
  chat?: ReactNode;
  onToggleSpace: (space: number) => void;
  onStageReserveDeck: (level: CardLevel) => void;
  onReservePyramid: (cardId: string) => void;
  onBuy: (cardId: string) => void;
  onSpendPrivilege: () => void;
  onRefill: () => void;
  onConfirm: () => void;
  /** Set while the token-return popup is closed: the turn button opens it again. */
  onReturn?: () => void;
  /** Set while a power's choice popup is closed: the turn button opens it again. */
  onAction?: () => void;
}

const TRAY_PANEL = "rounded-t-2xl rounded-b-none bg-card";
/** The viewer's plaque is a tray panel: named after the tray's corners, or they undo it. */
const VIEWER_PLAQUE = `${TRAY_PANEL} rounded-tl-none [--tab:calc(var(--spacing)*8)]`;
const ROYAL_IDS = ROYAL_CARDS.map((r) => r.id);

/**
 * The rival's reserved cards on their plaque, as on the Marvel board: a card taken from the pyramid is shown,
 * one taken blind is the back of its deck. Tapping shows them large.
 */
function RivalReserve({ reserved, ownerName }: { reserved: DuelViewReserved[]; ownerName: string }) {
  const face = (r: DuelViewReserved, className: string) =>
    "cardId" in r ? (
      <DuelCardView cardId={r.cardId} className={className} />
    ) : (
      <span className={cn("relative block aspect-card shrink-0 overflow-hidden ring-1 ring-foreground/10", className)}>
        {ASSETS.deckBacks[r.level] ? <AssetImage src={ASSETS.deckBacks[r.level]!} alt={`Face-down level ${r.level} card`} /> : null}
      </span>
    );
  const tray = Array.from({ length: MAX_RESERVED }, (_, i) => {
    const r = reserved[i];
    return r ? (
      <span key={i} className="relative flex rounded-sm">
        {face(r, "w-4 rounded-sm")}
      </span>
    ) : (
      <span key={i} className="aspect-card w-4 shrink-0 rounded-sm border border-dashed border-foreground/15" />
    );
  });
  if (reserved.length === 0) return <div className="flex shrink-0 gap-0.5">{tray}</div>;
  return (
    <Zoomable
      label={`Show ${ownerName}'s reserved cards`}
      title={`${ownerName}'s reserved cards`}
      className="flex shrink-0 gap-0.5"
      zoomed={<div className="flex gap-6">{reserved.map((r, i) => <span key={i}>{face(r, "w-38 rounded-[10%/7.1%]")}</span>)}</div>}
    >
      {tray}
    </Zoomable>
  );
}

/** The rules helpers read a full player; a view player is one with its reserved cards left out. */
export function asPlayer(p: DuelViewPlayer): DuelPlayer {
  return { seat: p.seat, tokens: p.tokens, cards: p.cards, reserved: [], privileges: p.privileges, royals: p.royals };
}

/** The Marvel plaque shows a player's tokens, bonuses, tags and points; a Duel player's crowns stand as tags, and their cards go by their pictures. */
function asPlaquePlayer(p: DuelViewPlayer): RedactedPlayerState {
  return { seat: p.seat, tokens: p.tokens, bonuses: p.bonuses, points: p.points, away: p.away, cards: artIdsOf(p.cards), reserved: [], locations: [], tags: p.crowns };
}

/**
 * The Duel table: the rival with the Royals down the left, the pyramid in the middle, the win tile over the
 * token board with the Privileges under it on the right, and the tray below. Props in, taps out; the client owns state.
 * On a tablet-shaped screen the rival, Royals, win tile and menu go across the top, the stones being taken go
 * under the Privileges, and the viewer's name tab stands on the tray itself, so the pyramid stops short of it.
 */
export function DuelBoard({
  view,
  turnEndsAt,
  players,
  staged,
  disabled,
  submitting,
  bubbles,
  menu,
  chat,
  onToggleSpace,
  onStageReserveDeck,
  onReservePyramid,
  onBuy,
  onSpendPrivilege,
  onRefill,
  onConfirm,
  onReturn,
  onAction,
}: DuelBoardProps) {
  const traced = useTracedMove();
  const tablet = useTabletLayout();
  // The affordable outline is a hint, shown only with ?cheat=true.
  const cheat = useSearchParams().get("cheat") === "true";
  const viewer = view.players[view.viewerSeat];
  const rival = view.players[1 - view.viewerSeat];
  const nameOf = (seat: number) => players.find((p) => p.seat === seat)?.name ?? `Seat ${seat + 1}`;
  const avatarOf = (seat: number) => players.find((p) => p.seat === seat)?.avatarUrl ?? null;
  const turnSeat = view.status === "active" ? view.currentSeat : null;
  const me = asPlayer(viewer);
  const myTurn = !disabled;
  const lineSpaces = staged?.kind === "line" ? staged.spaces : [];
  const canReserve = myTurn && viewer.reserved.length < MAX_RESERVED && view.board.includes(GOLD);
  const canRefill = myTurn && !view.refilled && view.bagCount > 0 && view.board.includes(null) && !staged;
  const tracedSpaces = traced?.move.type === "TAKE_LINE" ? traced.move.spaces : [];
  const tracedCard = traced && (traced.move.type === "BUY" || (traced.move.type === "RESERVE" && traced.move.from === "pyramid")) ? traced.move.cardId : null;
  // The three scrolls: those on the table first, then one dim per scroll a player holds, named.
  const scrolls = [
    ...Array<string | undefined>(view.privileges).fill(undefined),
    ...view.players.flatMap((p) => Array<string>(p.privileges).fill(p.seat === view.viewerSeat ? "You" : nameOf(p.seat))),
  ];
  const stagedCount = lineSpaces.length;
  const overLimit = totalTokens(viewer.tokens) + stagedCount > HAND_LIMIT;

  // Tapping the plaque shows the rival's team; the reserved cards open on their own.
  const rivalPlaque = (
    <TeamView owner={`${nameOf(rival.seat)}'s`} cardIds={rival.cards.map((c) => c.cardId)} duel>
      <PlayerPlaque
        player={asPlaquePlayer(rival)}
        name={nameOf(rival.seat)}
        avatarUrl={avatarOf(rival.seat)}
        startedGame={view.startingSeat === rival.seat}
        isCurrentTurn={turnSeat === rival.seat}
        turnEndsAt={turnEndsAt}
        turnSeconds={view.settings.turnTimeSeconds}
        bubble={bubbles[rival.seat]}
        className="mt-7"
        hideTags
        beside={<RivalReserve reserved={rival.reserved} ownerName={nameOf(rival.seat)} />}
      >
        {/* The badge and Privilege counts sit under the holdings, so the name's tab is left to the name. */}
        <Holdings bonuses={rival.bonuses} tokens={rival.tokens} colorPoints={colorPointsOf(asPlayer(rival))} />
        <span className="flex items-center gap-2 px-0.5 fs-2xs font-bold">
          <span className="flex items-center gap-0.5" title="Avengers badges">
            <AvengersIcon className="size-3.5" />
            {rival.crowns}
          </span>
          <HeldScrolls count={rival.privileges} />
        </span>
      </PlayerPlaque>
    </TeamView>
  );

  // Tapping shows the four large, as the Marvel Locations do; each is marked for the announcement to carry it.
  const royals = (
    <Zoomable
      label="Show the Locations"
      title="Locations"
      className={cn("w-fit rounded-lg bg-cosmos-950/60 p-2 ring-1 ring-foreground/10", !tablet && "m-auto")}
      zoomed={
        <div className="flex gap-4">
          {ROYAL_IDS.map((id) => (
            <RoyalCard key={id} royalId={id} tiles={view.royalTiles} taken={!view.royals.includes(id)} className="w-40 rounded-3xl" />
          ))}
        </div>
      }
    >
      <span className={cn("grid gap-1.5", tablet ? "grid-cols-4" : "grid-cols-2")} title="Locations: reach 3 Avengers badges and claim one; 6, another">
        {ROYAL_IDS.map((id) => (
          <span key={id} data-tile={id} className="block w-14 rounded-tile">
            <RoyalCard royalId={id} tiles={view.royalTiles} taken={!view.royals.includes(id)} className="w-full" />
          </span>
        ))}
      </span>
    </Zoomable>
  );

  // The pyramid, each row beside its deck, the rows as far apart as the Marvel market's.
  const pyramid = (
    <div className={cn("flex flex-col justify-center gap-4", tablet && "pb-8")}>
      {([3, 2, 1] as CardLevel[]).map((level) => {
        const back = ASSETS.deckBacks[level];
        const deckStaged = staged?.kind === "reserveDeck" && staged.level === level;
        return (
          <div key={level} className="flex items-center justify-center gap-2">
            <button
              type="button"
              disabled={!canReserve || view.deckCounts[level] === 0}
              onClick={() => onStageReserveDeck(level)}
              aria-label={`Reserve blind from the Level ${level} deck (${view.deckCounts[level]} left)`}
              className={cn(
                "relative mr-2 aspect-card w-14 shrink-0 overflow-hidden rounded-md ring-1 ring-foreground/10 disabled:cursor-default",
                deckStaged && "ring-2 ring-offset-2 ring-offset-background outline outline-primary",
                view.deckCounts[level] === 0 && "opacity-40",
              )}
            >
              {back ? <AssetImage src={back} alt="" /> : null}
            </button>
            {view.pyramid[level].map((cardId, slot) =>
              cardId ? (
                <DuelCard
                  key={cardId}
                  cardId={cardId}
                  className="w-14"
                  traced={tracedCard === cardId}
                  disabled={disabled}
                  affordable={cheat && canBuy(cardId, me)}
                  buy={{ onClick: () => onBuy(cardId), disabled: !myTurn || !canBuy(cardId, me) }}
                  reserve={{ onClick: () => onReservePyramid(cardId), disabled: !canReserve }}
                />
              ) : (
                <span key={`empty-${slot}`} className="aspect-card w-14 shrink-0 rounded-md border border-dashed border-foreground/15" />
              ),
            )}
          </div>
        );
      })}
    </div>
  );

  // How to win, and the Privileges under the board they are spent on.
  const privileges = (
    <div className="flex w-fit gap-2 rounded-lg bg-cosmos-950/60 p-1.5 ring-1 ring-foreground/10" title="Privileges: spend one you hold to take any one stone, not S.H.I.E.L.D.">
      {scrolls.map((holder, i) => (
        <Privilege key={i} takenBy={holder} onSpend={holder === "You" && myTurn && !staged ? onSpendPrivilege : undefined} />
      ))}
    </div>
  );
  const header = (
    <div className="mb-1 flex items-start justify-between gap-1">
      <WinTile />
      {menu}
    </div>
  );
  const tokenBoard = (
    <TokenBoard
      board={view.board}
      bagCount={view.bagCount}
      selected={lineSpaces}
      traced={tracedSpaces}
      onTap={myTurn ? onToggleSpace : undefined}
      canTap={(space) => lineSpaces.includes(space) || isLine(view.board, [...lineSpaces, space])}
      onRefill={canRefill ? onRefill : undefined}
    />
  );
  // The stones being taken this turn, as the Marvel tray holds its staged tokens; tap one to put it back.
  const taking = (
    <div className={cn("flex min-h-0 items-center gap-1.5 px-1", tablet ? "h-10 shrink-0 justify-center" : "flex-1")}>
      {lineSpaces.map((s) => (
        <button key={s} type="button" disabled={disabled} onClick={() => onToggleSpace(s)} aria-label="Put back" className="flex aspect-square w-10 shrink-0 rounded-full">
          <TokenChip color={view.board[s]!} className="size-full shadow-md" />
        </button>
      ))}
      {staged?.kind === "reserveDeck" ? <span className="fs-2xs font-bold text-cosmos-300">Reserving blind from Level {staged.level}</span> : null}
    </div>
  );

  const viewerPlaque = {
    player: asPlaquePlayer(viewer),
    name: nameOf(viewer.seat),
    avatarUrl: avatarOf(viewer.seat),
    startedGame: view.startingSeat === viewer.seat,
    isCurrentTurn: turnSeat === viewer.seat,
    turnEndsAt,
    turnSeconds: view.settings.turnTimeSeconds,
    bubble: bubbles[viewer.seat],
    hideTags: true,
    tabExtra: chat ? <div className="absolute -top-2 -right-2">{chat}</div> : null,
    openBottom: true,
    tabClassName: "w-32",
    bubbleClassName: "top-auto bottom-full left-32 mb-4 ml-4",
  };

  const holdings = (
    <>
      <HandTray
        tokens={viewer.tokens}
        bonuses={viewer.bonuses}
        cards={viewer.cards.map((c) => c.cardId)}
        duel
        colorPoints={colorPointsOf(me)}
        tags={viewer.crowns}
        stagedCount={stagedCount}
        extra={<HeldScrolls count={viewer.privileges} />}
      />
      {/* The viewer's reserved cards, laid out large on a tap, each recruitable when affordable. */}
      <ReservedFan
        cards={viewer.reserved.flatMap((r) =>
          "cardId" in r ? [{ id: r.cardId, name: duelArt(r.cardId).name, affordable: canBuy(r.cardId, me), face: (className: string) => <DuelCardView cardId={r.cardId} className={className} /> }] : [],
        )}
        disabled={!myTurn}
        onPick={onBuy}
      />
    </>
  );

  const endTurn = <EndTurnBar hasStaged={staged !== null} overLimit={overLimit} disabled={disabled} submitting={submitting} onConfirm={onConfirm} onReturn={onReturn} onAction={onAction} />;

  if (tablet) {
    return (
      <div className="flex h-130 w-full flex-col gap-2 p-2 pb-0">
        <div className="flex items-center justify-evenly gap-2">
          {rivalPlaque}
          {royals}
          {/* Boxed, or its own centering margins would spread the row. */}
          <div>
            <WinTile />
          </div>
          {menu}
        </div>
        <div className="flex min-h-0 flex-1 justify-between gap-2">
          {/* Centered in the room left of the token board. */}
          <div className="flex min-w-0 flex-1 justify-end">{pyramid}</div>
          <div className="flex w-47 flex-col gap-2">
            {tokenBoard}
            <div className="mx-auto">{privileges}</div>
            {taking}
          </div>
        </div>
        {/* The tray. */}
        <div className="flex h-16 shrink-0 items-stretch justify-center gap-2">
          <PlayerPlaque {...viewerPlaque} className={`w-fit flex-row items-center gap-2 px-1.5 py-0 ${VIEWER_PLAQUE}`}>
            {holdings}
          </PlayerPlaque>
          {endTurn}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-100 w-full flex-col gap-2 p-2 pb-0">
      <div className="flex min-h-0 flex-1 justify-between gap-2">
        {/* The rival, the Royal cards, the Privileges. */}
        {/* Room at the foot for the tab of the tray's plaque, so the Royals sit midway between the two plaques. */}
        <div className="flex w-44 flex-col gap-3 pb-12">
          {rivalPlaque}
          {royals}
        </div>

        {pyramid}

        <div className="flex w-47 flex-col gap-2">
          {header}
          {tokenBoard}
          <div className="mx-auto">{privileges}</div>
        </div>
      </div>

      {/* The tray. */}
      <div className="flex h-16 shrink-0 items-stretch gap-2">
        <PlayerPlaque {...viewerPlaque} className={`w-40 ${VIEWER_PLAQUE}`}>
          {taking}
        </PlayerPlaque>

        <div className={`mx-auto flex shrink-0 items-center gap-2 px-1.5 ring-1 ring-foreground/10 ${TRAY_PANEL}`}>{holdings}</div>

        {endTurn}
      </div>
    </div>
  );
}
