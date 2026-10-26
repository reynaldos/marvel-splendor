"use client";

import { cn } from "cn";

import { Skeleton } from "@/components/ui/skeleton";
import { useNotchSide } from "@/components/use-notch-side";

const times = (count: number) => Array.from({ length: count }, (_, i) => i);

function Piece({ className }: { className?: string }) {
  return (
    <Skeleton
      className={cn("shrink-0 motion-reduce:animate-none", className)}
    />
  );
}

/** The board while it loads: the same pieces in the same places, so nothing jumps when it arrives. */
export function BoardSkeleton() {
  return (
    <div
      data-notch={useNotchSide()}
      className="game-board theme-cosmos dark relative flex w-full items-end overflow-hidden bg-cosmos"
    >
      <div
        role="status"
        aria-label="Loading the game"
        className="flex h-100 w-full flex-col gap-2 p-2 pb-0"
      >
        <div className="flex min-h-0 flex-1 justify-between gap-2">
          <div className="flex flex-col gap-1.5">
            {times(2).map((plaque) => (
              <div key={plaque} className="relative mt-7 flex h-14 w-50 shrink-0">
                <Piece className="absolute bottom-full left-0 h-7 w-30 rounded-t-xl rounded-b-none bg-card" />
                <Piece className="flex-1 rounded-lg rounded-tl-none bg-card" />
              </div>
            ))}
          </div>

          <div className="flex flex-col justify-between">
            {times(3).map((row) => (
              <div key={row} className="flex items-center gap-2">
                <Piece className="mr-2 aspect-card w-16" />
                {times(4).map((card) => (
                  <Piece key={card} className="aspect-card w-16" />
                ))}
              </div>
            ))}
          </div>

          <div className="flex flex-col justify-between pl-6">
            {times(7).map((pile) => (
              <Piece key={pile} className="size-8 rounded-full" />
            ))}
          </div>

          <div className="flex w-32 flex-col gap-1">
            <div className="flex h-10 justify-end gap-2">
              <Piece className="aspect-[1404/688] h-full" />
              <Piece className="size-8" />
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center gap-1">
              {times(2).map((column) => (
                <div key={column} className="flex flex-col gap-1">
                  {times(2).map((tile) => (
                    <Piece key={tile} className="size-15 rounded-tile" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex h-20 items-stretch gap-2">
          {/* The player's own card: the name's tab standing on the card. */}
          <div className="relative flex w-40 shrink-0">
            <Piece className="absolute bottom-full left-0 h-8 w-32 rounded-t-xl rounded-b-none bg-card" />
            <Piece className="flex-1 rounded-tl-none rounded-tr-2xl rounded-b-none bg-card" />
          </div>
          <Piece className="mx-auto w-126 rounded-t-2xl rounded-b-none bg-card" />
          <div className="flex w-28 flex-col justify-end pb-2">
            <Piece className="h-12 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** The Duel board while it loads: the rival and the Locations on the left, the pyramid, the stone board on the right. */
export function DuelBoardSkeleton() {
  return (
    <div data-notch={useNotchSide()} className="game-board theme-cosmos dark relative flex w-full items-end overflow-hidden bg-cosmos">
      <div role="status" aria-label="Loading the game" className="flex h-100 w-full flex-col gap-2 p-2 pb-0">
        <div className="flex min-h-0 flex-1 justify-between gap-2">
          <div className="flex w-44 flex-col gap-3">
            <div className="relative mt-7 flex h-14 w-44 shrink-0">
              <Piece className="absolute bottom-full left-0 h-7 w-40 rounded-t-xl rounded-b-none bg-card" />
              <Piece className="flex-1 rounded-lg rounded-tl-none bg-card" />
            </div>
            <div className="grid w-fit grid-cols-2 gap-1.5 rounded-lg bg-cosmos-950/60 p-2">
              {times(4).map((tile) => (
                <Piece key={tile} className="size-12 rounded-tile" />
              ))}
            </div>
            <div className="flex w-fit gap-2 rounded-lg bg-cosmos-950/60 p-2">
              {times(3).map((scroll) => (
                <Piece key={scroll} className="mb-3.5 size-7 rounded-full" />
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between">
            {[3, 4, 5].map((slots) => (
              <div key={slots} className="flex items-center justify-center gap-2">
                <Piece className="mr-2 aspect-card w-14" />
                {times(slots).map((card) => (
                  <Piece key={card} className="aspect-card w-14" />
                ))}
              </div>
            ))}
          </div>

          <div className="flex w-47 flex-col gap-1.5">
            <div className="flex items-start justify-between gap-1">
              <Piece className="aspect-[1404/670] w-36" />
              <Piece className="size-8 rounded-full" />
            </div>
            <div className="mx-auto grid grid-cols-5 gap-1 rounded-lg bg-cosmos-950/60 p-1.5">
              {times(25).map((space) => (
                <Piece key={space} className="size-8 rounded-md" />
              ))}
            </div>
          </div>
        </div>

        <div className="flex h-16 items-stretch gap-2">
          <div className="relative flex w-40 shrink-0">
            <Piece className="absolute bottom-full left-0 h-8 w-32 rounded-t-xl rounded-b-none bg-card" />
            <Piece className="flex-1 rounded-tl-none rounded-tr-2xl rounded-b-none bg-card" />
          </div>
          <Piece className="mx-auto w-126 rounded-t-2xl rounded-b-none bg-card" />
          <div className="flex w-28 flex-col justify-end pb-2">
            <Piece className="h-12 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

