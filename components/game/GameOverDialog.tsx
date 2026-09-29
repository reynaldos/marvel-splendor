import Link from "next/link";
import { cn } from "cn";
import { Layers, Star } from "lucide-react";

import { AvengersIcon } from "@/components/game/assets";
import { PlayerAvatar } from "@/components/profile/PlayerAvatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { RankedPlayer } from "@/lib/game-record";

interface GameOverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  standings: RankedPlayer[];
  viewerSeat: number;
  round: number;
}

/** Shown when `status === "finished"` — how the whole table finished, styled like the profile's Game Record results (components/profile/GameRecords.tsx). */
export function GameOverDialog({ open, onOpenChange, standings, viewerSeat, round }: GameOverDialogProps) {
  const viewer = standings.find((p) => p.seat === viewerSeat);
  const won = viewer?.won ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "theme-cosmos dark max-h-[90dvh] gap-3 overflow-y-auto border-2 sm:max-w-lg",
          won ? "border-gold-400" : "border-red-600",
        )}
      >
        <DialogHeader className="items-center">
          <DialogTitle
            className={cn(
              "font-display text-2xl font-black tracking-widest uppercase",
              won ? "text-gold-400" : "text-red-400",
            )}
          >
            {won ? "Victory" : "Defeat"}
          </DialogTitle>
          <DialogDescription>{round} rounds</DialogDescription>
        </DialogHeader>

        <ol className="flex flex-col gap-2">
          {standings.map((player) => (
            <li
              key={player.seat}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2",
                player.seat === viewerSeat ? "bg-gold-200 text-cosmos-950" : "bg-cosmos-800",
              )}
            >
              <span className="w-5 text-center text-xl font-black">{player.place}</span>
              <PlayerAvatar src={player.avatarUrl} name={player.name} className="size-10 text-sm" />
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

        <Link
          href="/"
          className="flex h-12 items-center justify-center rounded-full bg-gold-400 font-display text-base font-black tracking-wide text-cosmos-950 uppercase hover:bg-gold-200"
        >
          Back to home
        </Link>
      </DialogContent>
    </Dialog>
  );
}
