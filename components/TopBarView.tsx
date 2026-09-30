"use client";

import { useState } from "react";
import Link from "next/link";
import { Coins, LogOut, Medal, Menu, ScrollText, Settings, Shield, Trophy } from "lucide-react";

import { Logo } from "@/components/home/Logo";
import { PlayerAvatar } from "@/components/profile/PlayerAvatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { markUpdatesSeen, NewDot, unseenCount, UpdateLog, useSeenUpdate } from "@/components/UpdateLog";
import { useNotchSide } from "@/components/use-notch-side";
import { FRAME_STYLE, type FrameTier } from "@/lib/frame-tier";

const PILL = "flex h-12 items-center gap-2 rounded-full bg-cosmos-700 px-4 ring-2 ring-cosmos-500 ring-inset";
const CHOICE =
  "flex h-12 items-center gap-3 rounded-full bg-cosmos-700 px-5 text-base font-bold ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500";

interface TopBarViewProps {
  username: string;
  avatarUrl: string | null;
  /** Their level's tier: a gem on the picture's corner, and the frame round it when `framed`. */
  tier: FrameTier;
  framed: boolean;
  /** Their level, and how far through it they are. */
  progress: { level: number; into: number; span: number };
  /** Null before their first rated game. */
  rating: number | null;
  wins: number;
  coins: number;
  isAdmin: boolean;
}

/** The top bar as drawn. It lies over the top of the screen's canvas, and scales with it. */
export function TopBarView({
  username,
  avatarUrl,
  tier,
  framed,
  progress,
  rating,
  wins,
  coins,
  isAdmin,
}: TopBarViewProps) {
  const [open, setOpen] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const seen = useSeenUpdate();
  // What had been seen when the log was opened, so the new ones stay marked while it is read.
  const [since, setSince] = useState(seen);
  const hasNew = unseenCount(seen) > 0;
  const close = () => setOpen(false);

  return (
    <div
      data-notch={useNotchSide()}
      // Level with the top of the canvas, which sits in the middle of a screen taller than it.
      className="stage dark pointer-events-none fixed inset-x-0 top-[calc((100dvh-var(--pad-b)-var(--spacing)*100)/2)] z-20 text-white"
    >
      <header className="pointer-events-auto relative mx-4 mt-2 flex h-12 items-center gap-3">
        <Link href={`/profile/${username}`} className={`${PILL} pl-1 hover:bg-cosmos-500`} style={FRAME_STYLE[tier]}>
          <span className="relative">
            <PlayerAvatar src={avatarUrl} name={username} tier={framed ? tier : undefined} />
            <span aria-hidden className="gem-badge absolute -right-1 -bottom-0.5 size-4" />
          </span>
          <span className="flex w-40 flex-col gap-1.5">
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate text-base leading-none font-bold">{username}</span>
              <span
                className="flex items-center gap-1 fs-2xs leading-none font-bold text-cosmos-300 tabular-nums"
                title="Rating"
              >
                <Medal className="size-3" />
                {rating ?? "Unranked"}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="fs-2xs leading-none font-black">Lv. {progress.level}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-cosmos-950 ring-1 ring-cosmos-500 ring-inset">
                <span
                  className="block h-full rounded-full bg-linear-to-r from-gold-600 to-gold-200"
                  style={{ width: `${(100 * progress.into) / progress.span}%` }}
                />
              </span>
            </span>
          </span>
        </Link>
        <span className={PILL} title="Games won">
          <Trophy className="size-6 text-gold-400" />
          <span className="text-lg font-black tabular-nums">{wins}</span>
        </span>
        <span className={PILL} title="Coins">
          <Coins className="size-6 text-gold-400" />
          <span className="text-lg font-black tabular-nums">{coins.toLocaleString()}</span>
        </span>
        {/* In the middle of the screen, whatever is either side of it. */}
        <Link href="/" aria-label="Home" className="ml-auto">
          <Logo className="text-3xl" />
        </Link>
        <button
          type="button"
          aria-label="Menu"
          onClick={() => setOpen(true)}
          className="relative flex size-12 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500"
        >
          <Menu className="size-6" />
          {hasNew ? <NewDot className="absolute top-0 right-0" /> : null}
        </button>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="theme-cosmos dark gap-3 border-2 border-gold-400 sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-black tracking-widest text-gold-400 uppercase">
              Menu
            </DialogTitle>
            <DialogDescription className="sr-only">The leaderboard, settings, and signing out.</DialogDescription>
          </DialogHeader>
          <Link href="/leaderboard" onClick={close} className={CHOICE}>
            <Medal className="size-5 text-gold-200" />
            Leaderboard
          </Link>
          <Link href="/settings" onClick={close} className={CHOICE}>
            <Settings className="size-5 text-gold-200" />
            Profile settings
          </Link>
          <button
            type="button"
            onClick={() => {
              close();
              setSince(seen);
              markUpdatesSeen();
              setUpdatesOpen(true);
            }}
            className={CHOICE}
          >
            <ScrollText className="size-5 text-gold-200" />
            What&apos;s new
            {hasNew ? <NewDot className="ml-auto" /> : null}
          </button>
          {isAdmin ? (
            <Link href="/admin/users" onClick={close} className={CHOICE}>
              <Shield className="size-5 text-gold-200" />
              Admin
            </Link>
          ) : null}
          {/* A plain link: signing out is a trip to the server, not a page of the app. */}
          <a href="/auth/logout" className={CHOICE}>
            <LogOut className="size-5 text-gold-200" />
            Log out
          </a>
        </DialogContent>
      </Dialog>
      <Dialog open={updatesOpen} onOpenChange={setUpdatesOpen}>
        <UpdateLog since={since} />
      </Dialog>
    </div>
  );
}
