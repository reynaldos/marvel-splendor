"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "cn";

import { BackLink } from "@/components/BackLink";
import { PlayerAvatar } from "@/components/profile/PlayerAvatar";
import { Stage, StageRows } from "@/components/Stage";
import type { FrameTier } from "@/lib/frame-tier";

export interface LeaderboardEntry {
  place: number;
  username: string;
  /** Account level, and the total XP behind it. */
  level: number;
  xp: number;
  avatarUrl: string | null;
  /** The level frame on their picture, when they have it turned on. */
  avatarTier?: FrameTier;
  /** Only on the ranked board. */
  rating?: number;
  gamesRated?: number;
}

interface LeaderboardScreenProps {
  /** Best first, already placed. */
  ranked: LeaderboardEntry[];
  byXp: LeaderboardEntry[];
  /** The viewer's username when they are on a list, so their row is picked out in gold. */
  own: string | null;
}

const BOARDS = [
  { name: "Ranked", key: "ranked", empty: "Nobody is ranked yet. Rank moves in private games with two or more people." },
  { name: "XP", key: "byXp", empty: "Nobody has earned XP yet. Finish a game to get on the board." },
] as const;

/** One player on the list. The viewer's own row is picked out in gold. */
export function LeaderboardRow({ row, own }: { row: LeaderboardEntry; own: string | null }) {
  const onRankedBoard = row.rating !== undefined;
  return (
    <li>
      <Link
        href={`/profile/${row.username}`}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-1 hover:brightness-125",
          row.username === own ? "bg-gold-200 text-cosmos-950" : "bg-cosmos-800",
        )}
      >
        <span className="w-8 text-center text-xl font-black tabular-nums">{row.place}</span>
        <PlayerAvatar src={row.avatarUrl} name={row.username} tier={row.avatarTier} className="size-8 text-xs" />
        <span className="flex min-h-9 min-w-0 flex-1 flex-col justify-center">
          <span className="truncate text-base leading-tight font-bold">{row.username}</span>
          {onRankedBoard ? null : (
            <span className="text-xs leading-tight font-bold tabular-nums opacity-70">Lv {row.level}</span>
          )}
        </span>
        {onRankedBoard ? (
          <span
            className="flex items-center gap-3 rounded-full bg-cosmos-950 px-3 py-1 text-sm font-black text-white tabular-nums"
            title={`${row.gamesRated} rated games`}
          >
            {row.rating}
            <span className="text-cosmos-300">{row.gamesRated}g</span>
          </span>
        ) : (
          <span className="rounded-full bg-cosmos-950 px-3 py-1 text-sm font-black text-white tabular-nums">
            {row.xp.toLocaleString()} XP
          </span>
        )}
      </Link>
    </li>
  );
}

/** Two boards under tabs: rank, and account XP. Tapping a row goes to that player's profile. */
export function LeaderboardScreen({ own, ...boards }: LeaderboardScreenProps) {
  const [open, setOpen] = useState<(typeof BOARDS)[number]>(BOARDS[0]);
  const rows = boards[open.key];

  return (
    <Stage>
      <StageRows>
        <div className="flex h-full min-h-0 flex-col gap-2">
          <div role="tablist" className="flex justify-center gap-1">
            {BOARDS.map((board) => (
              <button
                key={board.key}
                type="button"
                role="tab"
                aria-selected={board === open}
                onClick={() => setOpen(board)}
                className={cn(
                  "rounded-full px-4 py-1 font-display text-base font-black tracking-widest uppercase",
                  board === open ? "bg-gold-400 text-cosmos-950" : "text-cosmos-300 hover:text-white",
                )}
              >
                {board.name}
              </button>
            ))}
          </div>
          {rows.length === 0 ? (
            <p className="m-auto text-base font-bold text-cosmos-300">{open.empty}</p>
          ) : (
            <ol
              role="tabpanel"
              className="scroll-fade flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {rows.map((row) => (
                <LeaderboardRow key={row.username} row={row} own={own} />
              ))}
            </ol>
          )}
        </div>

        <footer>
          <BackLink />
        </footer>
      </StageRows>
    </Stage>
  );
}
