import Link from "next/link";
import { LogOut, Settings, Swords, Trophy } from "lucide-react";

import { AvengersArt, CardFanArt } from "@/components/home/art";
import { Logo } from "@/components/home/Logo";
import { ModeTile } from "@/components/home/ModeTile";
import { SettingsForm } from "@/components/lobby/SettingsForm";
import { Stage, StageRows } from "@/components/Stage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const PILL = "flex h-12 items-center gap-2 rounded-full bg-cosmos-700 px-4 ring-2 ring-cosmos-500 ring-inset";
const ICON_LINK =
  "flex size-12 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500";
// Dialogs open outside the stage, so they carry the look themselves.
const DIALOG = "theme-cosmos dark border-2 border-gold-400 max-h-[90dvh] overflow-y-auto";

/** What a visitor sees before signing in. */
export function WelcomeScreen() {
  return (
    <Stage className="justify-center">
      <div className="frame-gold flex w-150 items-center gap-8 rounded-3xl px-10 py-8">
        <div className="relative h-54 w-60 shrink-0">
          <CardFanArt />
        </div>
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo className="text-5xl" />
          <p className="font-display text-sm font-bold tracking-wide text-gold-400 uppercase">
            Bring together a team of super heroes and stop Thanos from ending the world
          </p>
          <p className="text-xs text-cosmos-300">
            Recruit heroes, gather the Infinity Stones, assemble the Avengers, and claim the Gauntlet.
          </p>
          <Button
            asChild
            className="h-12 rounded-full bg-marvel px-10 font-display text-base font-black tracking-wide text-white uppercase hover:bg-red-500"
          >
            <a href="/auth/login?returnTo=/">Sign in to play</a>
          </Button>
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
          <Link href="/profile" className={`${PILL} pl-1 hover:bg-cosmos-500`}>
            <Avatar className="size-10 ring-2 ring-gold-400">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
              <AvatarFallback>{username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
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
          <Dialog>
            <DialogTrigger asChild>
              <ModeTile label="VS Computer" tone="from-orange-400 to-red-700" art={<CardFanArt />} />
            </DialogTrigger>
            <DialogContent className={DIALOG}>
              <DialogHeader>
                <DialogTitle>Play vs Computer</DialogTitle>
                <DialogDescription>Set up the table and start straight away.</DialogDescription>
              </DialogHeader>
              <SettingsForm />
            </DialogContent>
          </Dialog>

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
