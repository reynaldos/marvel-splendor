import { cn } from "cn";
import { Layers, Star } from "lucide-react";

import { AvengersIcon } from "@/components/game/assets";
import { PlayerAvatar } from "@/components/profile/PlayerAvatar";
import type { RankedPlayer } from "@/lib/game-record";

interface StandingsProps {
  players: RankedPlayer[];
  /** Whose row is picked out in gold. */
  seat: number;
  /** Rows arrive one after another, for the moment a game ends. */
  animated?: boolean;
  className?: string;
}

/** How the table finished: everyone in order, with points, cards and Avengers badges. */
export function Standings({ players, seat, animated, className }: StandingsProps) {
  return (
    <ol className={cn("flex flex-col gap-1.5", className)}>
      {players.map((player, i) => (
        <li
          key={player.seat}
          style={animated ? { animationDelay: `${0.5 + i * 0.18}s` } : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-1",
            player.seat === seat ? "bg-gold-200 text-cosmos-950" : "bg-cosmos-800",
            animated && "result-row",
          )}
        >
          <span className="w-5 text-center text-xl font-black">{player.place}</span>
          <PlayerAvatar src={player.avatarUrl} name={player.name} className="size-8 text-xs" />
          <span className="min-w-0 flex-1 truncate text-base font-bold">{player.name}</span>
          <span className="flex items-center gap-3 rounded-full bg-cosmos-950 px-3 py-1 text-sm font-black text-white tabular-nums">
            <span className="flex items-center gap-1" title="Infinity Points">
              <Star className="size-4 fill-gold-400 text-gold-400" />
              {player.points}
            </span>
            <span className="flex items-center gap-1" title="Cards">
              <Layers className="size-4 text-gold-400" />
              {player.cards}
            </span>
            <span className="flex items-center gap-1" title="Avengers badges">
              <AvengersIcon className="size-4 text-xs" />
              {player.tags}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
