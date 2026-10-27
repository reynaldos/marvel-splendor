import type { ReactNode } from "react";
import { cn } from "cn";
import { toast } from "sonner";
import { Star } from "lucide-react";

import { AvengersIcon } from "@/components/game/assets";
import { tokenMeta } from "@/components/game/stone-colors";
import {
  STONES,
  TOKEN_COLORS,
  type Stone,
  type StoneCounts,
  type TokenCounts,
} from "@/lib/engine/types";
import type { RedactedPlayerState } from "@/lib/game-view";
import { PointsBadge } from "@/components/game/HandTray";
import { TurnTimer } from "@/components/game/TurnTimer";
import { ChatBubble, type ShownBubble } from "@/components/game/ChatBubble";
import { PlayerAvatar } from "@/components/profile/PlayerAvatar";

interface PlayerPlaqueProps {
  player: RedactedPlayerState;
  name: string;
  /** The player's picture; without one, their initials are shown. */
  avatarUrl?: string | null;
  isCurrentTurn: boolean;
  /** When the current turn runs out (device clock); null when untimed. */
  turnEndsAt: number | null;
  /** The turn's full length in seconds; null when untimed. */
  turnSeconds: number | null;
  /** What the player has just sent to the table. */
  bubble?: ShownBubble;
  /** Drawn on the name's tab (the viewer's chat button). */
  tabExtra?: ReactNode;
  /** Took the first turn, so the game ends on the player before them. */
  startedGame?: boolean;
  /** Stands on the card's top edge, between the tab and the points (opponents' reserved cards). */
  beside?: ReactNode;
  /** Hide the Avengers tag count (the viewer's is shown in the HandTray). */
  hideTags?: boolean;
  /** Replaces the default holdings grid (the viewer's are in the HandTray). */
  children?: ReactNode;
  className?: string;
  tabClassName?: string;
  bubbleClassName?: string;
  /** No bottom edge, for a card that runs off the bottom of the board. */
  openBottom?: boolean;
}

const TAB = "absolute bottom-full h-(--tab) w-30 rounded-t-xl bg-card";
/** The tab and its card are edged alike, in the trays' own edge; `--edge` is how thick. */
const EDGE_WIDTH = "border-(length:--edge)";
const EDGE = `${EDGE_WIDTH} border-foreground/10`;
/** The tab's side carries on the card's, and its foot lies on the card's top line: one line between the two. */
const TAB_LEFT = "left-[calc(var(--edge)*-1)]";

/**
 * A player's plaque: the picture and name on a tab standing on the card's top
 * edge, so they are easy to pick out; the points on the card's corner; the
 * holdings in the card. On their turn it glows and shows the timer. What they
 * send to the table shows beside it.
 */
export function PlayerPlaque({
  player,
  name,
  avatarUrl = null,
  isCurrentTurn,
  turnEndsAt,
  turnSeconds,
  bubble,
  tabExtra,
  startedGame,
  beside,
  hideTags,
  children,
  className,
  tabClassName,
  bubbleClassName,
  openBottom,
}: PlayerPlaqueProps) {
  return (
    <div
      className={cn(
        // `--tab` is the tab's height and `--pfp` the picture's size, a little more than the tab.
        "relative flex w-50 flex-col gap-1 rounded-lg rounded-tl-none bg-card p-1.5 transition-shadow [--edge:1px] [--pfp:calc(var(--tab)+var(--spacing)*1.5)] [--tab:calc(var(--spacing)*7)]",
        EDGE,
        className,
        openBottom && "border-b-0",
        isCurrentTurn && "border-primary [--edge:2px]",
      )}
    >
      {isCurrentTurn ? (
        // One glow cast by the tab and the card together: a glow on each met in a bright bar where they join.
        <span aria-hidden className="turn-glow pointer-events-none absolute inset-0 rounded-[inherit]">
          {/* Edged like the card and the tab, or the glow would lie over their edges and wash them out. */}
          <span
            className={cn(
              "absolute inset-[calc(var(--edge)*-1)] rounded-[inherit] border-primary bg-card",
              EDGE_WIDTH,
              openBottom && "border-b-0",
            )}
          />
          <span className={cn(TAB, TAB_LEFT, EDGE_WIDTH, "border-primary", tabClassName)} />
        </span>
      ) : null}
      <div
        className={cn(
          TAB,
          TAB_LEFT,
          "flex items-center gap-1 pr-1.5 pl-(--pfp)",
          EDGE,
          tabClassName,
          isCurrentTurn && "border-primary",
        )}
      >
        <span className="min-w-0 flex-1 truncate text-xs font-medium">{name}</span>
        {player.tags > 0 && !hideTags ? (
          <span className="flex items-center gap-0.5 fs-2xs font-bold" title="Avengers tags">
            <AvengersIcon className="size-3.5" />
            {player.tags}
          </span>
        ) : null}
        {tabExtra}
      </div>

      {/*
        Larger than its tab on purpose: it stands out over the tab's top, side and foot alike. It is
        drawn over the tab, not in it, so the tab's glow being cut off doesn't cut the picture.
      */}
      <span className="absolute bottom-[calc(100%-var(--spacing)*0.75)] -left-1 size-(--pfp)">
        <PlayerAvatar src={avatarUrl} name={name} className="size-full text-xs ring-1" />
        {startedGame ? (
          // The first player's token, on the picture's corner; a tap says whose it is.
          <button
            type="button"
            aria-label={`${name} started the game`}
            onClick={(e) => {
              e.stopPropagation();
              toast.info(`${name} started the game.`);
            }}
            className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-gold-400 ring-2 ring-gold-600 hover:bg-gold-200"
          />
        ) : null}
      </span>

      {beside ? <div className="absolute bottom-full left-30 mb-0.5 ml-0.5">{beside}</div> : null}

      <span className="absolute -top-2 -right-2 flex size-9 items-center justify-center" title="Points">
        <Star className="absolute size-full fill-gold-400 text-gold-600" />
        <span className="relative text-xs font-black text-cosmos-950 tabular-nums">{player.points}</span>
      </span>

      {children ?? <Holdings bonuses={player.bonuses} tokens={player.tokens} />}

      {/* Level with the name, straight after the reserved cards, its foot clear of the points. */}
      <ChatBubble bubble={bubble} className={cn("-top-7.5 left-44 ml-1", bubbleClassName)} />

      {isCurrentTurn ? (
        // Low on the card's edge, clear of the points on its corner.
        <div className="absolute top-3/4 -right-2 -translate-y-1/2 rounded-full bg-card text-card-foreground">
          <TurnTimer endsAt={turnEndsAt} seconds={turnSeconds} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * One column per token color: card bonuses as squares on top, tokens as
 * circles below. Every column is always drawn (empty ones dimmed) so a
 * color sits in the same place on every plaque.
 */
export function Holdings({
  bonuses,
  tokens,
  colorPoints,
  cellClassName = "size-5",
  className,
}: {
  bonuses: StoneCounts;
  tokens: TokenCounts;
  /** Points on cards of each color, as a star on each bonus cell (Duel). */
  colorPoints?: StoneCounts;
  cellClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-flow-col grid-rows-2 justify-start gap-1", className)}>
      {TOKEN_COLORS.map((color) => {
        const meta = tokenMeta(color);
        const bonus = STONES.includes(color as Stone) ? bonuses[color as Stone] : null;
        const cell = cn(
          "flex items-center justify-center text-xs font-bold tabular-nums",
          cellClassName,
          meta.swatch,
          meta.onSwatch,
        );
        return [
          bonus === null ? (
            <span key={`${color}-bonus`} />
          ) : (
            <span
              key={`${color}-bonus`}
              title={`${meta.label} bonuses`}
              className={cn(cell, "relative rounded-sm", bonus === 0 && "opacity-25")}
            >
              {bonus > 0 ? bonus : null}
              {colorPoints ? <PointsBadge points={colorPoints[color as Stone]} className="-top-1 -right-1 size-3" /> : null}
            </span>
          ),
          <span
            key={`${color}-tokens`}
            title={`${meta.label} tokens`}
            className={cn(cell, "rounded-full", tokens[color] === 0 && "opacity-25")}
          >
            {tokens[color] > 0 ? tokens[color] : null}
          </span>,
        ];
      })}
    </div>
  );
}
