import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GameOverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  winnerSeat: number | null;
  sharedWinners: number[] | null;
  nameForSeat: (seat: number) => string;
  viewerSeat: number;
}

/** Shown when `status === "finished"` (ARCHITECTURE.md §1 tiebreak / shared victory). */
export function GameOverDialog({
  open,
  onOpenChange,
  winnerSeat,
  sharedWinners,
  nameForSeat,
  viewerSeat,
}: GameOverDialogProps) {
  const isSharedVictory = Boolean(sharedWinners && sharedWinners.length > 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="theme-cosmos dark border-2 border-gold-400">
        <DialogHeader>
          <DialogTitle>Game over</DialogTitle>
          <DialogDescription>
            {isSharedVictory
              ? "A true tie — victory is shared."
              : winnerSeat !== null
                ? `${nameForSeat(winnerSeat)} wins!`
                : "The game has ended."}
          </DialogDescription>
        </DialogHeader>

        {isSharedVictory ? (
          <ul className="flex flex-col gap-1 text-sm">
            {sharedWinners!.map((seat) => (
              <li key={seat} className="font-medium">
                {nameForSeat(seat)}
                {seat === viewerSeat ? " (you)" : ""}
              </li>
            ))}
          </ul>
        ) : winnerSeat !== null ? (
          <p className="text-sm font-medium">
            {nameForSeat(winnerSeat)}
            {winnerSeat === viewerSeat ? " — that's you!" : ""}
          </p>
        ) : null}

        <DialogFooter>
          <Button asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
