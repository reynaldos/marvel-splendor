"use client";

import { useState, type ReactNode } from "react";
import { cn } from "cn";
import {
  Baby,
  Ban,
  CalendarClock,
  CircleHelp,
  Copyright,
  Dices,
  ExternalLink,
  Eye,
  Gamepad2,
  Globe,
  Handshake,
  KeyRound,
  MessageSquareText,
  Server,
  Smartphone,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { BackLink } from "@/components/BackLink";
import { AssetImage } from "@/components/game/assets";
import { Logo } from "@/components/home/Logo";
import { Stage, StageRows } from "@/components/Stage";
import { Pill } from "@/components/ui/pill";

/** When the policies below last changed. */
const UPDATED = "November 3, 2026";
const SITE = "https://reysanchez.dev";

const TABS = ["Credits", "Privacy", "Terms"] as const;

interface Tile {
  icon: LucideIcon;
  title: string;
  body: ReactNode;
}

const PRIVACY: Tile[] = [
  {
    icon: KeyRound,
    title: "Your sign-in",
    body: "You sign in through Auth0. We keep the account id, your email address and your name as they were at your last sign-in, to find your profile again. One account per email address.",
  },
  {
    icon: UserRound,
    title: "Your profile",
    body: "Your username, display name, profile picture, display choices, and whether you asked to stay off the leaderboard. An uploaded picture is stored on Cloudflare R2.",
  },
  {
    icon: Dices,
    title: "Your play",
    body: "Every game you join, each move in it, and the chat messages and emoji you send at the table. From these we work out your stats, rating, level, coins, collection and shop purchases.",
  },
  {
    icon: Globe,
    title: "Your visits",
    body: "Your IP address and browser type for each stretch of activity, to keep the game safe from abuse and to understand what devices it runs on.",
  },
  {
    icon: MessageSquareText,
    title: "Your feedback",
    body: "What you write in the Feedback form, with any notes an admin adds while acting on it.",
  },
  {
    icon: Ban,
    title: "What we never do",
    body: (
      <ul>
        <li>No advertising, and no advertising or analytics trackers.</li>
        <li>No selling or sharing of your data, beyond the services that run the game.</li>
        <li>No real-money payments. Coins are earned in play and have no cash value.</li>
      </ul>
    ),
  },
  {
    icon: Server,
    title: "Services that handle your data",
    body: "Auth0 handles sign-in. Vercel hosts the app and Neon holds the database. Pusher relays moves and chat between players. Cloudflare R2 stores uploaded pictures. If you ask for a team picture, the names and looks of the cards on your team are sent to OpenAI to draw it; nothing about you is sent.",
  },
  {
    icon: Smartphone,
    title: "On your device",
    body: "A sign-in cookie keeps you signed in. Your browser also remembers a few choices locally: sound and music, reduced motion, which updates you have read, and whether to show the add-to-home-screen tip. None of this leaves your device.",
  },
  {
    icon: Eye,
    title: "Who can see what",
    body: "Your username, picture, level, rating and game records are visible to other players on the leaderboard and on your profile. You can hide yourself from the leaderboard in Settings. Your email and IP address are never shown to other players. Admins can see feedback and visit records to run the game.",
  },
  {
    icon: Trash2,
    title: "Removing your data",
    body: "Open the menu and tap Delete account. Your profile, stats, rank, coins, collection and picture are removed at once. Finished games stay in the records with no name on your seat, so the other players keep their history. Ask through the Feedback form if you need anything else removed.",
  },
  {
    icon: Baby,
    title: "Children",
    body: "The game is not meant for children under 13, and we do not knowingly keep data about them.",
  },
  {
    icon: CalendarClock,
    title: "Changes",
    body: "If this policy changes, the new version is posted here with a new date.",
  },
];

const TERMS: Tile[] = [
  {
    icon: Gamepad2,
    title: "The game",
    body: (
      <ul>
        <li>Marvel Splendor is a free, non-commercial fan project. It can change, pause or close at any time.</li>
        <li>It is offered as is, with no promise that it will always work or that records will never be lost.</li>
        <li>Coins, cards, levels and ranks exist only in the game and have no value outside it.</li>
      </ul>
    ),
  },
  {
    icon: UserRound,
    title: "Your account",
    body: (
      <ul>
        <li>You need one account, with a real email address, and you keep your sign-in to yourself.</li>
        <li>You must be 13 or older.</li>
        <li>You can delete your account at any time from the menu.</li>
      </ul>
    ),
  },
  {
    icon: Handshake,
    title: "Fair play",
    body: (
      <ul>
        <li>Play your own games. No bots, scripts, extra accounts or tampering with the game.</li>
        <li>Keep chat, names and pictures clean. No harassment, hate, threats or sexual content.</li>
        <li>Do not post anything you do not have the right to post.</li>
        <li>An admin can remove content or block an account that breaks these rules.</li>
      </ul>
    ),
  },
  {
    icon: Copyright,
    title: "Ownership",
    body: "Marvel characters and art belong to Marvel. Splendor, its rules and its look belong to Space Cowboys and its designers. The code of this project belongs to its author. Nothing here gives you a right to any of it beyond playing the game.",
  },
  {
    icon: CircleHelp,
    title: "Questions",
    body: (
      <p>
        Use the Feedback form in the menu, or write through{" "}
        <a href={SITE} target="_blank" rel="noopener noreferrer" className="font-bold text-gold-200 underline underline-offset-2 hover:text-gold-400">
          reysanchez.dev
        </a>
        .
      </p>
    ),
  },
];

const PANEL = "scroll-fade min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const CARD = "rounded-2xl bg-cosmos-950/70 p-4 ring-2 ring-cosmos-500 ring-inset";
const SMALL = "text-xs leading-relaxed text-cosmos-300";
const EYEBROW = "font-display text-xs font-bold tracking-widest text-gold-400 uppercase";

/** The credits a game box carries: who made this, and the games it comes from. */
function Credits() {
  return (
    <div role="tabpanel" className="flex min-h-0 flex-1 items-center gap-6">
      <span className="frame-gold relative hidden aspect-[1182/1472] w-44 shrink-0 -rotate-3 overflow-hidden rounded-2xl [--frame-glow:rgb(246_201_69/0.3)] sm:block lg:w-56">
        <AssetImage src="/assets/box-cover.png" alt="The Splendor Marvel box" sizes="11rem" className="rounded-xl" />
      </span>

      {/* The column scrolls when the screen is short; `my-auto` keeps it level in the middle otherwise. */}
      <div className={cn(PANEL, "flex max-h-full flex-col")}>
        <div className="my-auto flex flex-col gap-3">
          <div className={cn(CARD, "flex flex-wrap items-center gap-x-6 gap-y-3")}>
            <Logo className="text-2xl" />
            {/* Wide enough for the eyebrow on two lines at most; the link wraps under when there is no room. */}
            <div className="flex min-w-60 flex-1 flex-col gap-0.5">
              <p className={EYEBROW}>Designed and developed by</p>
              <p className="text-2xl leading-tight font-black text-white">Rey Sanchez</p>
              <p className={SMALL}>A free fan project, made for the love of the game. Not for sale.</p>
            </div>
            <Pill asChild tone="gold">
              <a href={SITE} target="_blank" rel="noopener noreferrer">
                reysanchez.dev
                <ExternalLink className="size-4" />
              </a>
            </Pill>
          </div>

          <p className={cn(EYEBROW, "px-1")}>Based on</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Splendor", "Marc André", "Space Cowboys, part of Asmodee"],
              ["Splendor: Marvel Edition", "Marc André", "Space Cowboys, with art from Marvel"],
              ["Splendor Duel", "Marc André & Bruno Cathala", "Space Cowboys"],
            ].map(([game, by, publisher]) => (
              <div key={game} className={cn(CARD, "flex flex-col gap-1")}>
                <p className="text-base leading-tight font-black">{game}</p>
                <p className={SMALL}>
                  Designed by {by}. Published by {publisher}.
                </p>
              </div>
            ))}
          </div>

          <p className={cn(SMALL, "px-1")}>
            Marvel characters and art are © Marvel. Splendor is a trademark of Space Cowboys. This project is not made, endorsed or
            sponsored by Marvel, Space Cowboys or Asmodee. If you enjoy it, buy the board games. Built with Next.js and React on
            Vercel, Postgres on Neon, Auth0, Pusher and Cloudflare R2.
          </p>
        </div>
      </div>
    </div>
  );
}

/** A policy as a wall of tiles, one point each, so it can be read at a glance. */
function Tiles({ tiles, intro }: { tiles: Tile[]; intro: string }) {
  return (
    <div role="tabpanel" className={cn(PANEL, "flex flex-col gap-3")}>
      <p className={cn(SMALL, "text-center")}>
        {intro} Last updated {UPDATED}.
      </p>
      <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ icon: Icon, title, body }) => (
          <div key={title} className={cn(CARD, "flex gap-3")}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset">
              <Icon className="size-5" />
            </span>
            <div className="flex min-w-0 flex-col gap-1 text-sm leading-snug text-white/80 [&_li]:ml-4 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
              <h3 className="text-base leading-tight font-black text-white">{title}</h3>
              {typeof body === "string" ? <p>{body}</p> : body}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Credits, the privacy policy and the terms of play, one under each tab. */
export function AboutScreen() {
  const [open, setOpen] = useState<(typeof TABS)[number]>("Credits");

  return (
    <Stage>
      <StageRows>
        <div className="flex h-full min-h-0 flex-col gap-2">
          <div role="tablist" className="flex justify-center gap-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={tab === open}
                onClick={() => setOpen(tab)}
                className={cn(
                  "rounded-full px-4 py-1 font-display text-base font-black tracking-widest uppercase",
                  tab === open ? "bg-gold-400 text-cosmos-950" : "text-cosmos-300 hover:text-white",
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          {open === "Credits" ? (
            <Credits />
          ) : open === "Privacy" ? (
            <Tiles tiles={PRIVACY} intro="What the game keeps about you, why, and how to remove it." />
          ) : (
            <Tiles tiles={TERMS} intro="By playing, you agree to these." />
          )}
        </div>

        <footer>
          <BackLink />
        </footer>
      </StageRows>
    </Stage>
  );
}
