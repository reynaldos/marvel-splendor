import Link from "next/link";
import { cn } from "cn";

import { ASSETS, AssetImage } from "@/components/game/assets";
import { Standings } from "@/components/game/Standings";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { STONES } from "@/lib/engine/types";
import type { RankedPlayer } from "@/lib/game-record";

interface GameOverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  standings: RankedPlayer[];
  viewerSeat: number;
  round: number;
}

// Stones raining down on a win. Placed by hand so they don't fall in step: where across, how big, how long, how late.
const RAIN = [
  { left: 4, size: 26, time: 3.2, wait: 0 },
  { left: 14, size: 18, time: 4.1, wait: 1.1 },
  { left: 25, size: 30, time: 3.6, wait: 0.5 },
  { left: 36, size: 16, time: 4.6, wait: 1.8 },
  { left: 47, size: 24, time: 3.3, wait: 0.2 },
  { left: 57, size: 20, time: 4.3, wait: 1.4 },
  { left: 67, size: 28, time: 3.8, wait: 0.8 },
  { left: 77, size: 16, time: 4.8, wait: 2.1 },
  { left: 86, size: 24, time: 3.4, wait: 0.4 },
  { left: 94, size: 18, time: 4.2, wait: 1.6 },
];

const BUTTON =
  "flex h-9 items-center justify-center rounded-full font-display text-sm font-black tracking-wide uppercase shadow-lg";

/**
 * The end of a game. A win is gold: the Avengers badge in turning rays, with
 * the stones raining down. A loss is red: Thanos, looming. Then how the whole
 * table finished, arriving one row at a time.
 */
export function GameOverDialog({ open, onOpenChange, standings, viewerSeat, round }: GameOverDialogProps) {
  const winners = standings.filter((p) => p.won);
  const won = winners.some((p) => p.seat === viewerSeat);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "theme-cosmos dark grid max-h-[94dvh] min-h-[86dvh] w-[92dvw] grid-cols-[2fr_3fr] gap-0 overflow-x-hidden overflow-y-auto border-2 p-0 sm:max-w-4xl",
          won ? "result-glow-gold border-gold-400" : "result-glow-red border-red-600",
        )}
      >
        {/* Behind everything else, so the stones pass under the names and numbers. */}
        {won ? (
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            {RAIN.map(({ left, size, time, wait }, i) => (
              <span
                key={i}
                className="result-rain absolute -top-10 overflow-hidden rounded-full"
                style={{ left: `${left}%`, width: size, height: size, animationDuration: `${time}s`, animationDelay: `${wait}s` }}
              >
                <AssetImage src={`/assets/stones/${STONES[i % STONES.length]}-token.png`} alt="" sizes="5vw" />
              </span>
            ))}
          </div>
        ) : null}
        <div className={cn("relative min-h-56 overflow-hidden", !won && "bg-red-950")}>
          {won ? (
            <>
              <span className="result-rays absolute top-[36%] left-1/2 size-[180%] -translate-1/2" />
              <span className="result-pop absolute inset-x-0 top-[36%] mx-auto aspect-square h-[52%] -translate-y-1/2 drop-shadow-[0_0_1.5rem_rgb(246_201_69/0.8)]">
                {ASSETS.avengersIcon ? (
                  <AssetImage src={ASSETS.avengersIcon} alt="" sizes="20vw" className="object-contain" />
                ) : null}
              </span>
            </>
          ) : (
            <>
              <span className="result-pulse absolute inset-0 bg-radial from-red-600/70 to-transparent to-70%" />
              <span className="result-loom fade-edges absolute inset-x-0 -top-[26%] h-[135%]">
                <AssetImage src="/assets/thanos.png" alt="" sizes="30vw" className="object-cover object-top" />
              </span>
            </>
          )}
          {/* Under the art, so the standings have the column's whole height on a short screen. */}
          <div className="absolute inset-x-3 bottom-3 flex flex-col gap-2">
            {/* Closes the results to look over the final board; the board has a button to bring them back. */}
            <DialogClose className={cn(BUTTON, "bg-cosmos-700 text-white ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500")}>
              View board
            </DialogClose>
            <Link href="/" className={cn(BUTTON, "bg-gold-400 text-cosmos-950 hover:bg-gold-200")}>
              Back to home
            </Link>
          </div>
        </div>

        <div className="relative flex flex-col justify-center gap-2.5 px-4 py-3">
          <DialogHeader className="items-center gap-0">
            <DialogTitle
              className={cn(
                "result-pop font-display text-3xl font-black tracking-widest uppercase",
                won ? "text-gold" : "text-red-400",
              )}
            >
              {won ? "Victory" : "Defeat"}
            </DialogTitle>
            <DialogDescription>
              {winners.length > 1 ? "Shared victory" : won ? "You claimed the Gauntlet" : `${winners[0]?.name ?? "Nobody"} wins`}
              {" · "}
              {round} rounds
            </DialogDescription>
          </DialogHeader>

          <Standings players={standings} seat={viewerSeat} animated />
        </div>
      </DialogContent>
    </Dialog>
  );
}
