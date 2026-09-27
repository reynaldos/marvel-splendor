import { cn } from "cn";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TokenChip } from "@/components/game/TokenChip";
import { STONE_COLORS } from "@/components/game/stone-colors";
import { STONES, TOKEN_COLORS, type GameSettings, type Stone } from "@/lib/engine/types";
import type { RedactedPlayerState } from "@/lib/game-view";
import { TurnTimer } from "@/components/game/TurnTimer";
import { BanterBubble } from "@/components/game/BanterBubble";

interface PlayerPlaqueProps {
  player: RedactedPlayerState;
  name: string;
  isBot: boolean;
  isViewer: boolean;
  isCurrentTurn: boolean;
  settings: GameSettings;
  /** Changes whenever it becomes this player's turn again — resets TurnTimer. */
  turnKey: string;
  banterText?: string | null;
  className?: string;
}

/**
 * A player's plaque (ARCHITECTURE.md §6): avatar, name, points, bonus strip,
 * token strip, active-turn glow, and slots for the turn timer + banter
 * bubble.
 */
export function PlayerPlaque({
  player,
  name,
  isBot,
  isViewer,
  isCurrentTurn,
  settings,
  turnKey,
  banterText,
  className,
}: PlayerPlaqueProps) {
  const ownedBonuses = STONES.filter((s) => player.bonuses[s] > 0);
  const ownedTokens = TOKEN_COLORS.filter((c) => player.tokens[c] > 0);

  return (
    <div
      className={cn(
        "relative flex min-w-48 flex-col gap-1.5 rounded-lg bg-card p-2.5 ring-1 ring-foreground/10 transition-shadow",
        isCurrentTurn && "ring-2 ring-primary shadow-[0_0_0_4px_var(--color-primary)]/10",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Avatar size="sm">
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-1 flex-col leading-tight">
          <span className="flex items-center gap-1 text-xs font-medium">
            {name}
            {isViewer ? (
              <Badge variant="outline" className="h-4 px-1 text-[0.55rem]">
                You
              </Badge>
            ) : null}
            {isBot ? (
              <Badge variant="secondary" className="h-4 px-1 text-[0.55rem]">
                Bot
              </Badge>
            ) : null}
          </span>
          <span className="text-[0.65rem] text-muted-foreground">Seat {player.seat}</span>
        </div>
        <span className="text-lg font-bold tabular-nums">{player.points}</span>
      </div>

      {ownedBonuses.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {ownedBonuses.map((s: Stone) => (
            <span
              key={s}
              className={cn(
                "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.6rem] font-semibold",
                STONE_COLORS[s].swatch,
                STONE_COLORS[s].onSwatch,
              )}
            >
              {player.bonuses[s]}
            </span>
          ))}
        </div>
      ) : null}

      {ownedTokens.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {ownedTokens.map((c) => (
            <TokenChip key={c} color={c} count={player.tokens[c]} size="sm" />
          ))}
        </div>
      ) : (
        <span className="text-[0.6rem] text-muted-foreground">No tokens</span>
      )}

      <div className="flex items-center gap-1 text-[0.6rem] text-muted-foreground">
        <span>{player.cards.length} cards</span>
        <span aria-hidden>·</span>
        <span>{player.tags} tags</span>
        {player.locations.length > 0 ? (
          <>
            <span aria-hidden>·</span>
            <span>{player.locations.length} locations</span>
          </>
        ) : null}
      </div>

      {isCurrentTurn ? (
        <div className="absolute top-2 right-2">
          <TurnTimer turnTimeSeconds={settings.turnTimeSeconds} turnKey={turnKey} />
        </div>
      ) : null}

      <BanterBubble seat={player.seat} text={banterText ?? null} />
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
