"use client";

import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { ArrowLeft, Settings } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { CARD_LEVEL_UPS, RESULTS } from "./game-over/standings";

const PAGES = [
  { name: "Loading", href: "/preview/loading" },
  { name: "Board", href: "/preview/board" },
  { name: "Game over", href: "/preview/game-over" },
  { name: "Tiers", href: "/preview/tiers" },
  { name: "Foil", href: "/preview/foil" },
  { name: "Profile", href: "/preview/profile" },
  { name: "Pack", href: "/preview/pack" },
  { name: "How to", href: "/preview/how-to" },
  { name: "Squad pic", href: "/preview/team" },
];

/** What `?show=` takes on the board, by what it plays. */
export const SHOWS = {
  "An outline on a pick": ["3 tokens", "2 tokens", "Recruit", "Reserve", "Reserve blind", "Recruit reserved"],
  "Something sent to the table": ["Emoji", "Message"],
  "An announcement": ["Location", "Avengers", "TimeStone"],
  "The player's own card": ["MyTurn", "Chat"],
};
export const TABLE_SIZES = [2, 3, 4];
/** How many cards the game-over preview shows going up a level; its menu button goes round these. */
export const CARD_COUNTS = [0, 1, 3, CARD_LEVEL_UPS.length];

/** A button or link in the menu. Give it one of the `MENU_*` colours. */
export const MENU_PILL = "flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-black ring-1 ring-inset";
export const MENU_PLAIN = "bg-cosmos-950 text-white ring-white/60 hover:bg-cosmos-700";
export const MENU_LIT = "bg-white text-cosmos-950 ring-white";
export const MENU_GOLD = "bg-gold-400 text-cosmos-950 ring-gold-200 hover:bg-gold-200";
export const MENU_PALE = "bg-cosmos-300 text-cosmos-950 ring-cosmos-100 hover:bg-white";

const OPTION = "rounded-md bg-cosmos-950 px-1.5 py-0.5 font-mono text-gold-200 hover:bg-cosmos-700";
const HEADING = "font-display text-sm font-black tracking-widest text-gold-400 uppercase";

/** A titled row of the menu's buttons. */
export function MenuSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className={HEADING}>{title}</h3>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </section>
  );
}

/** A menu button that plays something on the page, closing the menu to show it. */
export function MenuPlay({ className, ...props }: ComponentProps<"button">) {
  return (
    <DialogClose asChild>
      <button type="button" className={cn(MENU_PILL, className)} {...props} />
    </DialogClose>
  );
}

function Options({ to, values }: { to: (value: string) => string; values: Array<string | number> }) {
  return (
    <span className="flex flex-wrap gap-1">
      {values.map((value) => (
        <a key={value} href={to(String(value))} className={OPTION}>
          {value}
        </a>
      ))}
    </span>
  );
}

function Entry({ option, children }: { option: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono font-bold text-gold-400">{option}</dt>
      <dd className="flex flex-col gap-1.5 text-cosmos-300">{children}</dd>
    </div>
  );
}

/** Everything the preview pages take in their address. Each value is a link that goes there. */
function AddressHelp() {
  const show = (name: string) => `/preview/board?show=${encodeURIComponent(name)}`;
  return (
    <details className="flex flex-col gap-3 rounded-lg bg-cosmos-950/60 p-3">
      <summary className={cn(HEADING, "cursor-pointer text-white")}>Address options</summary>
      <p className="mt-2 text-cosmos-300">
        What can be added to each page&apos;s address. Tap a value to go there. Join more than one with &amp;, as in{" "}
        <span className="font-mono">?players=4&amp;show=Emoji</span>.
      </p>

      <h4 className={cn(HEADING, "mt-3")}>Board</h4>
      <dl className="flex flex-col gap-3">
        <Entry option="?players=">
          How many are at the table. Three when left out.
          <Options to={(n) => `/preview/board?players=${n}`} values={TABLE_SIZES} />
        </Entry>
        <Entry option="?first=">
          The seat that went first and wears the token, 0 to one less than the players. The second seat when left out.
          <Options to={(seat) => `/preview/board?players=4&first=${seat}`} values={[0, 1, 2, 3]} />
        </Entry>
        <Entry option="?show=">
          Plays one thing as the page opens. The menu&apos;s buttons play the same things.
          {Object.entries(SHOWS).map(([what, names]) => (
            <span key={what} className="flex flex-col gap-1">
              {what}
              <Options to={show} values={names} />
            </span>
          ))}
        </Entry>
        <Entry option="?at=">
          With <span className="font-mono">?show=</span>, stops everything that many milliseconds in, to look at it held
          still.
          <Options to={(ms) => `/preview/board?show=TimeStone&at=${ms}`} values={[300, 1500, 3000]} />
        </Entry>
      </dl>

      <h4 className={cn(HEADING, "mt-3")}>Game over</h4>
      <dl className="flex flex-col gap-3">
        <Entry option="?result=">
          How the game ended for the viewer. A win when left out.
          <Options to={(result) => `/preview/game-over?result=${result}`} values={[...RESULTS]} />
        </Entry>
        <Entry option="?players=">
          How many played. Three when left out.
          <Options to={(n) => `/preview/game-over?players=${n}`} values={TABLE_SIZES} />
        </Entry>
        <Entry option="?cards=">
          How many of the viewer&apos;s cards went up a level, up to {CARD_LEVEL_UPS.length}. One when left out.
          <Options to={(n) => `/preview/game-over?cards=${n}`} values={CARD_COUNTS} />
        </Entry>
      </dl>

      <h4 className={cn(HEADING, "mt-3")}>Loading</h4>
      <p className="text-cosmos-300">Takes nothing: it is the board&apos;s loading screen, held still.</p>

      <h4 className={cn(HEADING, "mt-3")}>Tiers</h4>
      <p className="text-cosmos-300">
        Takes nothing: every frame tier, the rank badge and the leaderboard rows, side by side.
      </p>

      <h4 className={cn(HEADING, "mt-3")}>How to</h4>
      <dl className="flex flex-col gap-3">
        <Entry option="?slide=">
          Opens the how-to-play slideshow on that slide, counting from 1. Closed, with just its button, when left out.
          <Options to={(n) => `/preview/how-to?slide=${n}`} values={[1, 4, 6, 12]} />
        </Entry>
      </dl>
    </details>
  );
}

/**
 * A gear in the corner that opens the preview menu: the way between the preview
 * pages, then whatever the page puts in it, then what each page's address takes.
 */
export function PreviewMenu({ children }: { children?: ReactNode }) {
  const here = usePathname();
  return (
    <Dialog>
      <DialogTrigger
        aria-label="Preview menu"
        className="fixed top-[12dvh] right-3 z-30 flex size-11 items-center justify-center rounded-full bg-cosmos-950/80 text-gold-400 ring-2 ring-gold-400 hover:bg-cosmos-700"
      >
        <Settings className="size-6" />
      </DialogTrigger>
      <DialogContent className="theme-cosmos dark max-h-[calc(var(--screen-h)*0.9)] gap-5 overflow-y-auto border-2 border-gold-400 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wide text-gold-400 uppercase">Preview menu</DialogTitle>
          <DialogDescription>Screens to look at without signing in. Nothing here is read or saved.</DialogDescription>
        </DialogHeader>

        <MenuSection title="Pages">
          <Link href="/" aria-label="Back to the game" className={cn(MENU_PILL, MENU_PLAIN)}>
            <ArrowLeft className="size-4" />
          </Link>
          {PAGES.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              aria-current={here === page.href ? "page" : undefined}
              className={cn(MENU_PILL, here === page.href ? MENU_LIT : MENU_PLAIN)}
            >
              {page.name}
            </Link>
          ))}
        </MenuSection>

        {children}

        <AddressHelp />
      </DialogContent>
    </Dialog>
  );
}
