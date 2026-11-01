import Link from "next/link";
import { Medal } from "lucide-react";

import { CardFanArt, DuelArt, WelcomeArt } from "@/components/home/art";
import { HowToPlay } from "@/components/home/HowToPlay";
import { Logo } from "@/components/home/Logo";
import { ModeTile } from "@/components/home/ModeTile";
import { ShopButton } from "@/components/shop/ShopButton";
import { Stage, StageRows } from "@/components/Stage";

/** What a visitor sees before signing in. */
export function WelcomeScreen() {
  return (
    <Stage>
      <div className="relative h-100 w-full">
        <WelcomeArt />
        <div className="absolute inset-y-0 right-[6%] flex w-86 flex-col items-center justify-center gap-4 text-center">
          <Logo className="text-5xl" />
          <p className="font-display text-sm font-bold tracking-wide text-gold-400 uppercase">
            Bring together a team of super heroes and stop Thanos from ending the world
          </p>
          <p className="text-xs text-cosmos-300">
            Recruit heroes, gather the Infinity Stones, assemble the Avengers, and claim the Gauntlet.
          </p>
          <a
            href="/auth/login?returnTo=/"
            className="glow-gold flex h-13 items-center rounded-full bg-linear-to-b from-gold-200 via-gold-400 to-gold-600 px-12 font-display text-lg font-black tracking-wide text-cosmos-950 uppercase ring-2 ring-gold-200 hover:brightness-110"
          >
            Sign in to play
          </a>
        </div>
      </div>
    </Stage>
  );
}

/**
 * The main menu: the two games. With a room waiting (`lobbyId`), the Play Game tile goes straight back to it;
 * with a game against bots in play (`gameId`), the footer's line is the way back to it.
 */
export function HomeScreen({ lobbyId, gameId, duelPlayed }: { lobbyId: string | null; gameId: string | null; duelPlayed: boolean }) {
  return (
    <Stage>
      <StageRows>
        {/* On a screen taller than a phone the tiles grow, up to a point. */}
        <div className="flex max-h-80 min-h-64 flex-1 gap-6">
          <ModeTile
            href={lobbyId ? `/lobby/${lobbyId}` : "/private"}
            label={lobbyId ? "Rejoin your room" : "Play Game"}
            tone="from-orange-400 to-red-700"
            art={<CardFanArt />}
            className={lobbyId ? "glow-gold" : undefined}
          />
          <ModeTile href="/duel" label="Play Duel" tone="from-sky-400 to-blue-800" art={<DuelArt />} />
        </div>

        <footer className="flex items-center gap-4">
          <ShopButton />
          {/* Keeps the line centred, with two buttons on the right. */}
          <span aria-hidden className="w-14" />
          {gameId ? (
            <span className="flex flex-1 justify-center">
              <Link
                href={`/play/${gameId}`}
                className="glow-gold flex h-11 items-center rounded-full bg-linear-to-b from-gold-200 via-gold-400 to-gold-600 px-8 font-display text-sm font-black tracking-wide text-cosmos-950 uppercase ring-2 ring-gold-200 hover:brightness-110"
              >
                Continue your game
              </Link>
            </span>
          ) : (
            <p className="flex-1 text-center font-display text-xs font-bold tracking-widest text-gold-400 uppercase">
              Assemble the Avengers · Claim the Gauntlet
            </p>
          )}
          <Link
            href="/leaderboard"
            aria-label="Leaderboard"
            className="flex size-14 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset outline-none hover:bg-cosmos-500 focus-visible:ring-gold-400"
          >
            <Medal className="size-6" />
          </Link>
          <HowToPlay badge={!duelPlayed} />
        </footer>
      </StageRows>
    </Stage>
  );
}
