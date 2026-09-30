"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "cn";
import { Layers } from "lucide-react";

import { BackLink } from "@/components/BackLink";
import { GameOverDialog } from "@/components/game/GameOverDialog";
import { Stage, StageRows } from "@/components/Stage";

import { CARD_COUNTS, PreviewBar } from "../PreviewBar";
import { RESULTS, rewardsFor, standingsFor, type Result } from "./standings";

const LABEL = { win: "Win", loss: "Loss", shared: "Shared win" };

/** The end of a game, without playing one: choose a result and how many players, and it plays. */
export function GameOverPreview({ result, players, cards }: { result: Result; players: number; cards: number }) {
  // Counts the showings: each one is a fresh popup, so it plays from the start. Nothing until Play is pressed.
  const [showing, setShowing] = useState<number | null>(null);
  const { standings, viewerSeat } = standingsFor(result, players);
  const nextCards = CARD_COUNTS[(CARD_COUNTS.indexOf(cards) + 1) % CARD_COUNTS.length];

  return (
    <Stage>
      <StageRows>
        <h1 className="font-display text-2xl font-black tracking-widest text-gold-400 uppercase">
          End of game preview
        </h1>
        <div className="flex flex-col items-center gap-4">
          {[2, 3, 4].map((count) => (
            <div key={count} className="flex items-center gap-3">
              <span className="w-28 text-base font-bold">{count} players</span>
              {RESULTS.map((option) => (
                <Link
                  key={option}
                  href={`/preview/game-over?result=${option}&players=${count}`}
                  className={cn(
                    "flex h-11 w-36 items-center justify-center rounded-full text-base font-black ring-2 ring-inset",
                    option === result && count === players
                      ? "bg-gold-400 text-cosmos-950 ring-gold-200"
                      : "bg-cosmos-950 ring-cosmos-500 hover:bg-cosmos-700",
                  )}
                >
                  {LABEL[option]}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <footer className="flex items-center justify-between">
          <BackLink />
          <button
            type="button"
            onClick={() => setShowing((n) => (n ?? 0) + 1)}
            className="h-13 w-64 rounded-full bg-gold-400 font-display text-lg font-black tracking-wide text-cosmos-950 uppercase shadow-lg hover:bg-gold-200"
          >
            Play
          </button>
        </footer>
      </StageRows>
      <div className="fixed inset-x-0 bottom-1 z-30 flex justify-center gap-1">
        <PreviewBar />
        {/* Goes round how many cards level up: 0, 1, 3, 6, and back to 0. */}
        <Link
          href={`/preview/game-over?result=${result}&players=${players}&cards=${nextCards}`}
          aria-label={`${cards} cards level up. Change to ${nextCards}`}
          className="flex items-center gap-1 rounded-full bg-cosmos-950 px-2 py-0.5 fs-2xs font-black text-white ring-1 ring-white/60 ring-inset hover:bg-cosmos-700"
        >
          <Layers className="size-[1.2em]" />
          {cards} cards
        </Link>
      </div>
      <GameOverDialog
        key={showing}
        open={showing !== null}
        onOpenChange={(open) => !open && setShowing(null)}
        standings={standings}
        rewards={rewardsFor(standings, cards)}
        viewerSeat={viewerSeat}
        round={27}
      />
    </Stage>
  );
}
