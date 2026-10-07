"use client";

import { ChevronDown } from "lucide-react";

import { markSeen, useSeen } from "@/components/seen";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import updates from "@/data/updates.json";

const KINDS = [
  { key: "new", label: "New", tag: "bg-gold-400 text-cosmos-950" },
  { key: "improved", label: "Better", tag: "bg-sky-300 text-cosmos-950" },
  { key: "fixed", label: "Fixed", tag: "bg-emerald-300 text-cosmos-950" },
] as const;

const SEEN_KEY = "updates-seen";
const LATEST = updates[0].version;

export function markUpdatesSeen() {
  markSeen(SEEN_KEY, LATEST);
}

/** The release this device last saw, or null if it has never opened the log. */
export function useSeenUpdate() {
  return useSeen(SEEN_KEY, LATEST);
}

/** Releases newer than the one last seen. Someone who has seen none is shown the latest. */
export function unseenCount(seen: string | null) {
  const at = updates.findIndex((release) => release.version === seen);
  return at === -1 ? 1 : at;
}

export function NewDot({ label = "New updates", className = "" }: { label?: string; className?: string }) {
  return <span aria-label={label} className={`size-3 rounded-full bg-gold-400 ring-2 ring-cosmos-950 ${className}`} />;
}

// Read as UTC, so the day doesn't shift with the reader's time zone.
const day = (date: string) =>
  new Date(date).toLocaleDateString("en", { day: "numeric", month: "short", timeZone: "UTC" });

/** Every release, latest first, with the ones new since `since` marked and open. Goes inside a column-laid-out DialogContent. */
export function UpdateLog({ since }: { since: string | null }) {
  const unseen = unseenCount(since);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-base font-black tracking-widest text-gold-400 uppercase">
          What&apos;s new
        </DialogTitle>
        <DialogDescription className="text-sm text-white/60">
          {unseen ? "New since you were last here, in gold." : "You're all caught up."}
        </DialogDescription>
      </DialogHeader>
      <ol className="scroll-fade-top -mr-2 -mb-4 flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain pr-2 pb-4!">
        {updates.map((release, i) => {
          const isNew = i < unseen;
          return (
            <li key={release.version}>
              <details
                // The new ones are open; with none new, the latest is.
                open={isNew || (unseen === 0 && i === 0)}
                className={`group rounded-2xl px-4 py-3 ring-2 ring-inset ${
                  isNew ? "bg-gold-400/10 ring-gold-400" : "bg-cosmos-700/60 ring-cosmos-500"
                }`}
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-base font-bold">
                      {isNew ? (
                        <span className="rounded-full bg-gold-400 px-2 text-xs font-black tracking-wide text-cosmos-950 uppercase">
                          New
                        </span>
                      ) : null}
                      {release.title}
                    </span>
                    <span className="block text-sm text-white/70">{release.summary}</span>
                  </span>
                  <time dateTime={release.date} className="text-xs whitespace-nowrap text-white/60">
                    {day(release.date)}
                  </time>
                  <ChevronDown className="size-5 text-gold-200 transition-transform group-open:rotate-180" />
                </summary>
                <ul className="mt-3 space-y-2 text-sm">
                  {KINDS.flatMap(({ key, label, tag }) =>
                    release[key].map((change) => (
                      <li key={change} className="flex items-baseline gap-2">
                        <span className={`w-14 shrink-0 rounded-full text-center text-xs font-bold ${tag}`}>{label}</span>
                        {change}
                      </li>
                    )),
                  )}
                </ul>
                <p className="mt-3 text-right text-xs text-white/40">Version {release.version}</p>
              </details>
            </li>
          );
        })}
      </ol>
    </>
  );
}
