"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { ArrowLeft } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { RESULTS } from "./game-over/standings";

const PAGES = [
  { name: "Loading", href: "/preview/loading" },
  { name: "Board", href: "/preview/board" },
  { name: "Game over", href: "/preview/game-over" },
];

/** What `?show=` takes on the board, by what it plays. */
export const SHOWS = {
  "An outline on a pick": ["3 tokens", "2 tokens", "Recruit", "Reserve", "Reserve blind", "Recruit reserved"],
  "Something sent to the table": ["Emoji", "Message"],
  "An announcement": ["Location", "Avengers", "TimeStone"],
  "The player's own card": ["MyTurn", "Chat"],
};
export const TABLE_SIZES = [2, 3, 4];

const PILL = "rounded-full px-2 py-0.5 fs-2xs font-black ring-1 ring-inset";
const OPTION = "rounded-md bg-cosmos-950 px-1.5 py-0.5 font-mono text-gold-200 hover:bg-cosmos-700";

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

const HEADING = "font-display text-sm font-black tracking-widest text-white uppercase";

/** Everything the preview pages take in their address. Each value is a link that goes there. */
function Help() {
  const show = (name: string) => `/preview/board?show=${encodeURIComponent(name)}`;
  return (
    <Dialog>
      <DialogTrigger className={cn(PILL, "bg-white text-cosmos-950 ring-white hover:bg-gold-200")} aria-label="Help">
        ?
      </DialogTrigger>
      <DialogContent className="theme-cosmos dark max-h-[90dvh] overflow-y-auto border-2 border-gold-400 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wide text-gold-400 uppercase">Preview pages</DialogTitle>
          <DialogDescription>
            What can be added to each page&apos;s address. Tap a value to go there. Join more than one with &amp;, as in{" "}
            <span className="font-mono">?players=4&amp;show=Emoji</span>.
          </DialogDescription>
        </DialogHeader>

        <h3 className={HEADING}>Board</h3>
        <dl className="flex flex-col gap-3">
          <Entry option="?players=">
            How many are at the table. Three when left out.
            <Options to={(n) => `/preview/board?players=${n}`} values={TABLE_SIZES} />
          </Entry>
          <Entry option="?show=">
            Plays one thing as the page opens. The buttons along the bottom play the same things.
            {Object.entries(SHOWS).map(([what, names]) => (
              <span key={what} className="flex flex-col gap-1">
                {what}
                <Options to={show} values={names} />
              </span>
            ))}
          </Entry>
          <Entry option="?at=">
            With <span className="font-mono">?show=</span>, stops everything that many milliseconds in, to look at it
            held still.
            <Options to={(ms) => `/preview/board?show=TimeStone&at=${ms}`} values={[300, 1500, 3000]} />
          </Entry>
        </dl>

        <h3 className={HEADING}>Game over</h3>
        <dl className="flex flex-col gap-3">
          <Entry option="?result=">
            How the game ended for the viewer. A win when left out.
            <Options to={(result) => `/preview/game-over?result=${result}`} values={[...RESULTS]} />
          </Entry>
          <Entry option="?players=">
            How many played. Three when left out.
            <Options to={(n) => `/preview/game-over?players=${n}`} values={TABLE_SIZES} />
          </Entry>
        </dl>

        <h3 className={HEADING}>Loading</h3>
        <p className="text-cosmos-300">Takes nothing: it is the board&apos;s loading screen, held still.</p>
      </DialogContent>
    </Dialog>
  );
}

/** Moves between the preview pages, and explains what each takes. Goes in a page's row of buttons. */
export function PreviewBar() {
  const here = usePathname();
  return (
    <>
      <Link
        href="/"
        aria-label="Back to the game"
        className={cn(PILL, "flex items-center bg-cosmos-950 text-white ring-white/60 hover:bg-cosmos-700")}
      >
        <ArrowLeft className="size-[1.2em]" />
      </Link>
      {PAGES.map((page) => (
        <Link
          key={page.href}
          href={page.href}
          aria-current={here === page.href ? "page" : undefined}
          className={cn(
            PILL,
            here === page.href
              ? "bg-white text-cosmos-950 ring-white"
              : "bg-cosmos-950 text-white ring-white/60 hover:bg-cosmos-700",
          )}
        >
          {page.name}
        </Link>
      ))}
      <Help />
    </>
  );
}

/** The bar on its own along the bottom, for a page with no row of buttons to put it in. */
export function PreviewBarRow() {
  return (
    <div className="fixed inset-x-0 bottom-1 z-30 flex justify-center gap-1">
      <PreviewBar />
    </div>
  );
}
