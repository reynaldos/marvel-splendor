"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, DoorOpen, Flag, History, Hourglass, Menu, Settings, Star, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoveLog, type MoveLogEntry } from "@/components/game/MoveLog";
import { Rule } from "@/components/lobby/Rule";
import { SoundToggles } from "@/components/SoundToggles";
import { TimerIcon } from "@/components/lobby/TimerIcon";
import type { GameSettings } from "@/lib/engine/types";

interface GameMenuProps {
  moveLog: MoveLogEntry[];
  players: Array<{ seat: number; name: string; isBot: boolean }>;
  viewerSeat: number;
  settings: GameSettings;
  /** The game has ended; swaps Forfeit for Close game. */
  finished: boolean;
  /** A move is being sent or played back, so forfeiting has to wait. */
  busy: boolean;
  onForfeit: () => void;
}

const HEADING = "font-display text-xl font-black tracking-wide text-gold-400 uppercase";
const RULE_ICON = "size-8";
const PILL = "flex h-11 flex-1 items-center justify-center rounded-full font-display text-sm font-black tracking-wide uppercase";

function capitalize(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

/** The board's top-right menu: forfeit, move log, game settings, and leaving a finished game. */
export function GameMenu({ moveLog, players, viewerSeat, settings, finished, busy, onForfeit }: GameMenuProps) {
  const [open, setOpen] = useState<"moves" | "settings" | "forfeit" | null>(null);
  const hasBots = players.some((p) => p.isBot);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="icon" aria-label="Menu">
            <Menu />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="theme-cosmos dark w-44 border-2 border-gold-400">
          <DropdownMenuItem onSelect={() => setOpen("moves")}>
            <History className="size-4 text-gold-400" />
            Moves
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setOpen("settings")}>
            <Settings className="size-4 text-gold-400" />
            Game settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {finished ? (
            <DropdownMenuItem asChild>
              <Link href="/">
                <DoorOpen className="size-4" />
                Close game
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem variant="destructive" disabled={busy} onSelect={() => setOpen("forfeit")}>
              <Flag className="size-4" />
              Forfeit game
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent className={`theme-cosmos dark border-2 border-gold-400 max-h-[calc(var(--screen-h)*0.9)] overflow-y-auto ${open === "moves" ? "sm:max-w-lg" : ""}`}>
          {open === "moves" ? (
            <>
              <DialogHeader>
                <DialogTitle className={HEADING}>Move log</DialogTitle>
              </DialogHeader>
              <MoveLog entries={moveLog} players={players} viewerSeat={viewerSeat} />
            </>
          ) : null}

          {open === "settings" ? (
            <>
              <DialogHeader>
                <DialogTitle className={HEADING}>Game settings</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <Rule
                  icon={<UsersRound className={`${RULE_ICON} fill-gold-400 text-gold-600`} />}
                  label="Players"
                  value={`${players.length}`}
                />
                <Rule
                  icon={<Star className={`${RULE_ICON} fill-gold-400 text-gold-600`} />}
                  label={settings.rules === "duel" ? "To win" : "Points to win"}
                  value={settings.rules === "duel" ? "20 pts, 10 badges, or 10 in a color" : `${settings.targetPoints}`}
                />
                <Rule
                  icon={<TimerIcon className={RULE_ICON} />}
                  label="Turn timer"
                  value={settings.turnTimeSeconds === null ? "Untimed" : `${settings.turnTimeSeconds} sec`}
                />
                {settings.rules !== "duel" ? (
                  <Rule
                    icon={<Hourglass className={`${RULE_ICON} text-gold-400`} />}
                    label="Game clock"
                    value={settings.gameTimeMinutes === null ? "No clock" : `${settings.gameTimeMinutes} min`}
                  />
                ) : null}
                {hasBots ? (
                  <Rule
                    icon={<Bot className={`${RULE_ICON} text-gold-400`} />}
                    label="Bot difficulty"
                    value={capitalize(settings.botDifficulty ?? "normal")}
                  />
                ) : null}
              </div>
              <SoundToggles />
            </>
          ) : null}

          {open === "forfeit" ? (
            <>
              <DialogHeader>
                <DialogTitle className={HEADING}>Forfeit this game?</DialogTitle>
                <DialogDescription>You will lose and the game ends now. This can&apos;t be undone.</DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  className={`${PILL} bg-cosmos-800 ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-700`}
                >
                  Keep playing
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setOpen(null);
                    onForfeit();
                  }}
                  className={`${PILL} bg-marvel text-white hover:bg-red-500 disabled:bg-cosmos-700 disabled:text-cosmos-300`}
                >
                  Forfeit
                </button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
