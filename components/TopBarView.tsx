"use client";

import { useState } from "react";
import Link from "next/link";
import { Coins, LogOut, Medal, Menu, MessageSquareText, ScrollText, Shield, Trash2, Trophy } from "lucide-react";

import { DailyBonus } from "@/components/DailyBonus";
import { FeedbackForm } from "@/components/FeedbackForm";
import { FoilLayer } from "@/components/Foil";
import { Logo } from "@/components/home/Logo";
import { PlayerAvatar } from "@/components/profile/PlayerAvatar";
import { SoundToggles } from "@/components/SoundToggles";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { markUpdatesSeen, NewDot, unseenCount, UpdateLog, useSeenUpdate } from "@/components/UpdateLog";
import { useNotchSide } from "@/components/use-notch-side";
import type { DailyBonusState } from "@/lib/daily-bonus";
import { FRAME_STYLE, type FrameTier } from "@/lib/frame-tier";

const PILL = "flex h-12 items-center gap-2 rounded-full bg-cosmos-700 px-4 ring-2 ring-cosmos-500 ring-inset";
const TITLE = "font-display text-base font-black tracking-widest text-gold-400 uppercase";
/** A round picture button with its name under it, in the row along the top of the menu. */
const CHOICE =
  "group flex w-20 flex-col items-center gap-1.5 text-xs font-bold tracking-wide uppercase outline-none [&>span]:focus-visible:ring-gold-400";
const CHOICE_ICON =
  "relative flex size-14 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset group-hover:bg-cosmos-500";
const WIDE = "flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-base font-bold outline-none focus-visible:ring-2 focus-visible:ring-gold-400";

interface TopBarViewProps {
  username: string;
  avatarUrl: string | null;
  /** Their level's tier: the frame round the picture and a gem on its corner. */
  tier: FrameTier;
  /** Their level, and how far through it they are. */
  progress: { level: number; into: number; span: number };
  /** Null before their first rated game. */
  rating: number | null;
  wins: number;
  coins: number;
  isAdmin: boolean;
  /** Feedback no admin has looked at yet; lights the menu and its Admin choice. Always false for players. */
  newFeedback: boolean;
  dailyBonus: DailyBonusState;
  onClaimDailyBonus: () => Promise<number>;
  onDeleteAccount: () => Promise<void>;
}

/** The top bar as drawn. It lies over the top of the screen's canvas, and scales with it. */
export function TopBarView({
  username,
  avatarUrl,
  tier,
  progress,
  rating,
  wins,
  coins,
  isAdmin,
  newFeedback,
  dailyBonus,
  onClaimDailyBonus,
  onDeleteAccount,
}: TopBarViewProps) {
  const [open, setOpen] = useState(false);
  // The menu, the log and the delete check share one dialog: two overlapping ones left stale pointer locks on touch.
  const [view, setView] = useState<"menu" | "updates" | "delete" | "feedback" | "daily">("menu");
  const seen = useSeenUpdate();
  // What had been seen when the log was opened, so the new ones stay marked while it is read.
  const [since, setSince] = useState(seen);
  const hasNew = unseenCount(seen) > 0;
  const close = () => setOpen(false);

  return (
    <div
      data-notch={useNotchSide()}
      // Level with the top of the canvas, which sits in the middle of a screen taller than it.
      className="stage dark pointer-events-none fixed inset-x-0 top-[calc((var(--screen-h)-var(--pad-b)-var(--spacing)*100)/2)] z-20 text-white"
    >
      <header className="pointer-events-auto relative mx-4 mt-2 flex h-12 items-center gap-3">
        <FoilLayer tight />
        <Link href={`/profile/${username}`} className={`${PILL} pl-1 hover:bg-cosmos-500`} style={FRAME_STYLE[tier]}>
          <span className="relative">
            <PlayerAvatar src={avatarUrl} name={username} tier={tier} />
            <span aria-hidden className="gem-badge absolute -right-1 -bottom-0.5 z-10 size-4" />
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
        <button
          type="button"
          title="Coins · daily bonus"
          onClick={() => {
            setView("daily");
            setOpen(true);
          }}
          className={`${PILL} relative hover:bg-cosmos-500`}
        >
          <Coins className="size-6 text-gold-400" />
          <span className="text-lg font-black tabular-nums">{coins.toLocaleString()}</span>
          {dailyBonus.claimable ? <NewDot label="Daily bonus ready" className="absolute top-0 right-0" /> : null}
        </button>
        {/* In the middle of the screen, whatever is either side of it. */}
        <Link href="/" aria-label="Home" className="ml-auto">
          <Logo className="text-3xl" />
        </Link>
        <button
          type="button"
          aria-label="Menu"
          onClick={() => {
            setView("menu");
            setOpen(true);
          }}
          className="relative flex size-14 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500"
        >
          <Menu className="size-6" />
          {hasNew || newFeedback ? <NewDot className="absolute top-0 right-0" /> : null}
        </button>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={`theme-cosmos dark border-2 border-gold-400 ${
            view === "updates" ? "flex max-h-[calc(var(--screen-h)*0.9)] flex-col gap-0 sm:max-w-lg" : view === "daily" ? "gap-4 sm:max-w-lg" : "gap-4 sm:max-w-md"
          }`}
        >
          {view === "updates" ? (
            <UpdateLog since={since} />
          ) : view === "feedback" ? (
            <FeedbackForm onSent={close} />
          ) : view === "daily" ? (
            <DailyBonus state={dailyBonus} onClaim={onClaimDailyBonus} />
          ) : view === "delete" ? (
            <>
              <DialogHeader>
                <DialogTitle className={TITLE}>Delete your account?</DialogTitle>
                <DialogDescription className="text-sm text-white/70">
                  Your profile, stats, rank, coins and collection go for good. Games you played stay, with no name on
                  your seat.
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setView("menu")}
                  className={`${WIDE} bg-cosmos-700 ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500`}
                >
                  Keep it
                </button>
                <form action={onDeleteAccount} className="flex flex-1">
                  <button type="submit" className={`${WIDE} bg-marvel text-white hover:bg-red-500`}>
                    Delete for good
                  </button>
                </form>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className={TITLE}>Menu</DialogTitle>
                <DialogDescription className="sr-only">
                  What&apos;s new, feedback, sound, and signing out.
                </DialogDescription>
              </DialogHeader>
              <nav className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSince(seen);
                    markUpdatesSeen();
                    setView("updates");
                  }}
                  className={CHOICE}
                >
                  <span className={CHOICE_ICON}>
                    <ScrollText className="size-7" />
                    {hasNew ? <NewDot className="absolute top-0 right-0" /> : null}
                  </span>
                  What&apos;s new
                </button>
                <button type="button" onClick={() => setView("feedback")} className={CHOICE}>
                  <span className={CHOICE_ICON}>
                    <MessageSquareText className="size-7" />
                  </span>
                  Feedback
                </button>
                {isAdmin ? (
                  <Link href="/admin/users" onClick={close} className={CHOICE}>
                    <span className={CHOICE_ICON}>
                      <Shield className="size-7" />
                      {newFeedback ? <NewDot label="New feedback" className="absolute top-0 right-0" /> : null}
                    </span>
                    Admin
                  </Link>
                ) : null}
              </nav>
              <hr className="border-cosmos-500" />
              <SoundToggles />
              <hr className="border-cosmos-500" />
              <div className="flex gap-3">
                {/* A plain link: signing out is a trip to the server, not a page of the app. */}
                <a href="/auth/logout" className={`${WIDE} bg-cosmos-700 ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500`}>
                  <LogOut className="size-5 text-gold-200" />
                  Sign out
                </a>
                <button
                  type="button"
                  onClick={() => setView("delete")}
                  className={`${WIDE} bg-marvel text-white hover:bg-red-500`}
                >
                  <Trash2 className="size-5" />
                  Delete
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
