"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

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
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={() => setOpen("moves")}>Moves</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setOpen("settings")}>Game settings</DropdownMenuItem>
          <DropdownMenuSeparator />
          {finished ? (
            <DropdownMenuItem asChild>
              <Link href="/">Close game</Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem variant="destructive" disabled={busy} onSelect={() => setOpen("forfeit")}>
              Forfeit game
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          {open === "moves" ? (
            <>
              <DialogHeader>
                <DialogTitle>Move log</DialogTitle>
              </DialogHeader>
              <MoveLog entries={moveLog} players={players} viewerSeat={viewerSeat} />
            </>
          ) : null}

          {open === "settings" ? (
            <>
              <DialogHeader>
                <DialogTitle>Game settings</DialogTitle>
              </DialogHeader>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">Players</dt>
                <dd>{players.length}</dd>
                <dt className="text-muted-foreground">Points to win</dt>
                <dd>{settings.targetPoints}</dd>
                <dt className="text-muted-foreground">Turn timer</dt>
                <dd>{settings.turnTimeSeconds === null ? "Untimed" : `${settings.turnTimeSeconds} seconds`}</dd>
                <dt className="text-muted-foreground">Game clock</dt>
                <dd>{settings.gameTimeMinutes === null ? "No overall clock" : `${settings.gameTimeMinutes} minutes`}</dd>
                {hasBots ? (
                  <>
                    <dt className="text-muted-foreground">Bot difficulty</dt>
                    <dd className="capitalize">{settings.botDifficulty ?? "normal"}</dd>
                  </>
                ) : null}
              </dl>
            </>
          ) : null}

          {open === "forfeit" ? (
            <>
              <DialogHeader>
                <DialogTitle>Forfeit this game?</DialogTitle>
                <DialogDescription>You will lose and the game ends now. This can&apos;t be undone.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(null)}>
                  Keep playing
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => {
                    setOpen(null);
                    onForfeit();
                  }}
                >
                  Forfeit
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
