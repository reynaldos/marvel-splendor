"use client";

import { useState } from "react";
import Link from "next/link";
import { Award, Bot, DoorOpen, Flag, History, Hourglass, Menu, Palette, Pause, Settings, Star, UsersRound } from "lucide-react";

import { Pill } from "@/components/ui/pill";
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
import type { RoyalTiles } from "@/lib/duel/types";
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
  /** Set for a game against bots in play: pauses it. */
  onPause?: () => void;
  /** The Location tile each Royal wears in this Duel, for the move log. */
  royalTiles?: RoyalTiles;
}

const RULE_ICON = "size-8";
/** A row of the menu. The menu is drawn outside the board, so it sets its own size. */
const ITEM = "h-12 gap-3 rounded-xl px-4 text-base font-bold focus:bg-cosmos-700";
const ITEM_ICON = "size-5 text-gold-400";

function capitalize(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

/** The board's top-right menu: pause (against bots), forfeit, move log, game settings, and leaving a finished game. */
export function GameMenu({ moveLog, players, viewerSeat, settings, finished, busy, onForfeit, onPause, royalTiles }: GameMenuProps) {
  const [open, setOpen] = useState<"moves" | "settings" | "forfeit" | null>(null);
  const hasBots = players.some((p) => p.isBot);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Menu"
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-1 ring-cosmos-500 ring-inset hover:bg-cosmos-500"
          >
            <Menu className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="theme-cosmos dark frame-gold w-60 rounded-2xl p-2 [--frame-glow:rgb(246_201_69/0.3)]">
          <DropdownMenuItem className={ITEM} onSelect={() => setOpen("moves")}>
            <History className={ITEM_ICON} />
            Moves
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM} onSelect={() => setOpen("settings")}>
            <Settings className={ITEM_ICON} />
            Game settings
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-2 bg-cosmos-500" />
          {onPause && !finished ? (
            <DropdownMenuItem className={ITEM} disabled={busy} onSelect={onPause}>
              <Pause className={ITEM_ICON} />
              Pause game
            </DropdownMenuItem>
          ) : null}
          {finished ? (
            <DropdownMenuItem className={ITEM} asChild>
              <Link href="/">
                <DoorOpen className={ITEM_ICON} />
                Close game
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem className={ITEM} variant="destructive" disabled={busy} onSelect={() => setOpen("forfeit")}>
              <Flag className="size-5" />
              Forfeit game
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent className={`max-h-[calc(var(--screen-h)*0.9)] overflow-y-auto ${open === "moves" ? "sm:max-w-lg" : "sm:max-w-md"}`}>
          {open === "moves" ? (
            <>
              <DialogHeader>
                <DialogTitle>Move log</DialogTitle>
              </DialogHeader>
              <MoveLog entries={moveLog} players={players} viewerSeat={viewerSeat} royalTiles={royalTiles} />
            </>
          ) : null}

          {open === "settings" ? (
            <>
              <DialogHeader>
                <DialogTitle>Game settings</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <Rule
                  icon={<UsersRound className={`${RULE_ICON} fill-gold-400 text-gold-600`} />}
                  label="Players"
                  value={`${players.length}`}
                />
                <Rule
                  icon={<Star className={`${RULE_ICON} fill-gold-400 text-gold-600`} />}
                  label="Points to win"
                  value={settings.rules === "duel" ? "20" : `${settings.targetPoints}`}
                />
                {/* A Duel has two more ways to win; each gets its own tile so nothing wraps. */}
                {settings.rules === "duel" ? (
                  <>
                    <Rule icon={<Award className={`${RULE_ICON} text-gold-400`} />} label="Badges to win" value="10" />
                    <Rule icon={<Palette className={`${RULE_ICON} text-gold-400`} />} label="One color to win" value="10 pts" />
                  </>
                ) : null}
                <Rule
                  icon={<TimerIcon className={RULE_ICON} />}
                  label="Turn timer"
                  value={settings.turnTimeSeconds === null ? "Untimed" : `${settings.turnTimeSeconds} sec`}
                />
                <Rule
                  icon={<Hourglass className={`${RULE_ICON} text-gold-400`} />}
                  label="Game clock"
                  value={settings.gameTimeMinutes === null ? "No clock" : `${settings.gameTimeMinutes} min`}
                />
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
                <DialogTitle>Forfeit this game?</DialogTitle>
                <DialogDescription>You will lose and the game ends now. This can&apos;t be undone.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Pill className="flex-1" onClick={() => setOpen(null)}>
                  Keep playing
                </Pill>
                <Pill
                  tone="red"
                  className="flex-1"
                  disabled={busy}
                  onClick={() => {
                    setOpen(null);
                    onForfeit();
                  }}
                >
                  Forfeit
                </Pill>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
