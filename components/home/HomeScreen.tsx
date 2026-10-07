import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { AvengersArt, CardFanArt, WelcomeArt } from "@/components/home/art";
import { HowToPlay } from "@/components/home/HowToPlay";
import { Logo } from "@/components/home/Logo";
import { ModeTile } from "@/components/home/ModeTile";
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

/** The main menu: the ways to play. With a room waiting (`lobbyId`), the Private Game tile goes straight back to it. */
export function HomeScreen({ lobbyId }: { lobbyId: string | null }) {
  return (
    <Stage>
      <StageRows>
        <div className="flex h-64 gap-6">
          <ModeTile href="/solo" label="VS Computer" tone="from-orange-400 to-red-700" art={<CardFanArt />} />
          <ModeTile
            href={lobbyId ? `/lobby/${lobbyId}` : "/private"}
            label={lobbyId ? "Rejoin your room" : "Private Game"}
            tone="from-violet-400 to-purple-800"
            art={<AvengersArt />}
            className={lobbyId ? "glow-gold" : undefined}
          />
        </div>

        <footer className="flex items-center gap-4">
          <Link
            href="/shop"
            aria-label="Shop"
            className="flex size-12 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset outline-none hover:bg-cosmos-500 focus-visible:ring-gold-400"
          >
            <ShoppingBag className="size-6" />
          </Link>
          <p className="flex-1 text-center font-display text-xs font-bold tracking-widest text-gold-400 uppercase">
            Assemble the Avengers · Claim the Gauntlet
          </p>
          <HowToPlay />
        </footer>
      </StageRows>
    </Stage>
  );
}
