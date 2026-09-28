import type { ReactNode } from "react";
import { cn } from "cn";
import { Star } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { TurnTimer } from "@/components/game/TurnTimer";
import { BanterBubble } from "@/components/game/BanterBubble";

interface PlayerPlaqueProps {
  player: RedactedPlayerState;
  name: string;
  isCurrentTurn: boolean;
  /** When the current turn runs out (device clock); null when untimed. */
  turnEndsAt: number | null;
  /** The turn's full length in seconds; null when untimed. */
  turnSeconds: number | null;
  banterText?: string | null;
  /** Rendered in the header, before the points (opponents' reserved cards). */
  headerExtra?: ReactNode;
  /** Hide the Avengers tag count (the viewer's is shown in the HandTray). */
  hideTags?: boolean;
  /** Replaces the default holdings grid (the viewer's are in the HandTray). */
  children?: ReactNode;
  className?: string;
}

/**
 * A player's plaque (ARCHITECTURE.md §6): avatar, name, Avengers tags,
 * points, holdings, active-turn glow, and slots for the turn timer + banter
 * bubble.
 */
export function PlayerPlaque({
  player,
  name,
  isCurrentTurn,
  turnEndsAt,
  turnSeconds,
  banterText,
  headerExtra,
  hideTags,
  children,
  className,
}: PlayerPlaqueProps) {
  return (
    <div
      className={cn(
        "relative flex w-50 flex-col gap-1 rounded-lg bg-card p-1.5 ring-1 ring-foreground/10 transition-shadow",
        className,
        // The glow is what picks out whose turn it is from across the table.
        isCurrentTurn &&
          "shadow-[0_0_calc(var(--spacing)*4)_calc(var(--spacing)*0.5)_rgb(255_255_255/0.55)] ring-2 ring-primary",
      )}
    >
      <div className="flex h-6 items-center gap-1 pr-6">
        <Avatar size="sm">
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 truncate text-xs font-medium">{name}</span>
        {player.tags > 0 && !hideTags ? (
          <span className="flex items-center gap-0.5 fs-2xs font-bold" title="Avengers tags">
            <AvengersIcon className="size-3.5" />
            {player.tags}
          </span>
        ) : null}
        {headerExtra}
      </div>

      {/* Hangs off the corner so the name gets the header's full width. */}
      <span className="absolute -top-2 -right-2 flex size-9 items-center justify-center" title="Points">
        <Star className="absolute size-full fill-gold-400 text-gold-600" />
        <span className="relative text-xs font-black text-cosmos-950 tabular-nums">{player.points}</span>
      </span>

      {children ?? <Holdings bonuses={player.bonuses} tokens={player.tokens} />}

      {isCurrentTurn ? (
        <div className="absolute top-1/2 -right-2 -translate-y-1/2 rounded-full bg-card text-card-foreground">
          <TurnTimer endsAt={turnEndsAt} seconds={turnSeconds} />
        </div>
      ) : null}

      <BanterBubble seat={player.seat} text={banterText ?? null} />
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
  cellClassName = "size-5",
  className,
}: {
  bonuses: StoneCounts;
  tokens: TokenCounts;
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
              className={cn(cell, "rounded-sm", bonus === 0 && "opacity-25")}
            >
              {bonus > 0 ? bonus : null}
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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
