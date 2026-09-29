"use client";

import { useState } from "react";
import { cn } from "cn";
import { Star, Timer, UsersRound } from "lucide-react";

import { Standings } from "@/components/game/Standings";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ordinal, timeAgo, type GameRecord } from "@/lib/game-record";

const MODE = { VS_BOT: "VS Computer", MULTIPLAYER: "Private Game" };
const LEVELS = ["I", "II", "III"];
const GOLD_ICON = "fill-gold-400 text-gold-400";

function Figure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="flex flex-col gap-0.5 text-left">
      <span className="text-xs font-bold">{label}</span>
      <span className="flex items-center gap-1.5 text-lg font-black text-gold-400 tabular-nums">{children}</span>
    </span>
  );
}

/** A player's finished games, latest first. Tapping one shows how the table finished. */
export function GameRecords({ games }: { games: GameRecord[] }) {
  const [open, setOpen] = useState<GameRecord | null>(null);

  if (games.length === 0) {
    return <p className="m-auto text-base font-bold text-cosmos-300">No finished games yet.</p>;
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {games.map((game) => (
          <li key={game.id}>
            <button
              type="button"
              onClick={() => setOpen(game)}
              aria-label={`${ordinal(game.place)} place, ${timeAgo(game.endedAt)}. Show results`}
              className={cn(
                "relative flex h-15 w-full items-center gap-6 rounded-xl px-4 ring-2 ring-inset hover:brightness-125",
                game.won ? "bg-cosmos-700 ring-gold-400" : "bg-red-950 ring-red-700",
              )}
            >
              <span className="flex w-16 flex-col text-left">
                <span className={cn("text-xl font-black", game.won ? "text-gold-400" : "text-red-300")}>
                  {ordinal(game.place)}
                </span>
                <span className="fs-2xs font-bold whitespace-nowrap opacity-70">{timeAgo(game.endedAt)}</span>
              </span>
              <Figure label="Players">
                <UsersRound className={cn("size-5", GOLD_ICON)} />
                {game.players.length}
              </Figure>
              <Figure label="Rounds">
                <Timer className="size-5" />
                {game.rounds}
              </Figure>
              <Figure label="Final score">
                <Star className={cn("size-5", GOLD_ICON)} />
                {game.players.find((p) => p.seat === game.seat)?.points}
              </Figure>
              <Figure label="Cards">
                {game.cardsByLevel.map((count, i) => (
                  <span key={LEVELS[i]} className="flex items-center gap-1">
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-sm bg-gold-200 px-0.5 fs-2xs text-cosmos-950">
                      {LEVELS[i]}
                    </span>
                    {count}
                  </span>
                ))}
              </Figure>
              <span className="absolute top-2 right-2 rounded-full bg-black/50 px-2.5 py-0.5 fs-2xs font-bold">
                {MODE[game.mode]}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={open !== null} onOpenChange={(isOpen) => !isOpen && setOpen(null)}>
        {open ? <Results game={open} /> : null}
      </Dialog>
    </>
  );
}

/** How the table finished: everyone in order, with the record's owner picked out. */
function Results({ game }: { game: GameRecord }) {
  return (
    <DialogContent
      className={cn(
        "theme-cosmos dark max-h-[90dvh] gap-3 overflow-y-auto border-2 sm:max-w-lg",
        game.won ? "border-gold-400" : "border-red-600",
      )}
    >
      <DialogHeader className="items-center">
        <DialogTitle
          className={cn(
            "font-display text-2xl font-black tracking-widest uppercase",
            game.won ? "text-gold-400" : "text-red-400",
          )}
        >
          {game.won ? "Victory" : "Defeat"}
        </DialogTitle>
        <DialogDescription>
          {MODE[game.mode]} · {game.rounds} rounds · {timeAgo(game.endedAt)}
        </DialogDescription>
      </DialogHeader>
      <Standings players={game.players} seat={game.seat} />
    </DialogContent>
  );
}
