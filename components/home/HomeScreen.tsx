import Link from "next/link";
import { LogOut, Settings, Swords, Trophy } from "lucide-react";

import { AvengersArt, CardFanArt, WelcomeArt } from "@/components/home/art";
import { Logo } from "@/components/home/Logo";
import { ModeTile } from "@/components/home/ModeTile";
import { PlayerAvatar } from "@/components/profile/PlayerAvatar";
import { Stage, StageRows } from "@/components/Stage";

const PILL = "flex h-12 items-center gap-2 rounded-full bg-cosmos-700 px-4 ring-2 ring-cosmos-500 ring-inset";
const ICON_LINK =
  "flex size-12 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500";

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

interface HomeScreenProps {
  username: string;
  avatarUrl: string | null;
  wins: number;
  gamesPlayed: number;
}

/** The main menu: who you are along the top, the ways to play below. */
export function HomeScreen({ username, avatarUrl, wins, gamesPlayed }: HomeScreenProps) {
  return (
    <Stage>
      <StageRows>
        <header className="flex items-center gap-4">
          <Link href={`/profile/${username}`} className={`${PILL} pl-1 hover:bg-cosmos-500`}>
            <PlayerAvatar src={avatarUrl} name={username} />
            <span className="max-w-40 truncate text-base font-bold">{username}</span>
          </Link>
          <span className={PILL} title="Games won">
            <Trophy className="size-6 text-gold-400" />
            <span className="text-lg font-black tabular-nums">{wins}</span>
          </span>
          <span className={PILL} title="Games played">
            <Swords className="size-6 text-gold-400" />
            <span className="text-lg font-black tabular-nums">{gamesPlayed}</span>
          </span>
          <Logo className="mx-auto text-3xl" />
          <Link href="/settings" aria-label="Settings" className={ICON_LINK}>
            <Settings className="size-6" />
          </Link>
          <a href="/auth/logout" aria-label="Sign out" className={ICON_LINK}>
            <LogOut className="size-6" />
          </a>
        </header>

        <div className="flex min-h-0 flex-1 gap-8">
          <ModeTile href="/solo" label="VS Computer" tone="from-orange-400 to-red-700" art={<CardFanArt />} />

          <ModeTile
            href="/private"
            label="Private Game"
            tone="from-violet-400 to-purple-800"
            art={<AvengersArt />}
          />
        </div>

        <p className="text-center font-display text-xs font-bold tracking-widest text-gold-400 uppercase">
          Assemble the Avengers · Claim the Gauntlet
        </p>
      </StageRows>
    </Stage>
  );
}
