import Link from "next/link";
import { cn } from "cn";

import { BackLink } from "@/components/BackLink";
import { PlayerAvatar } from "@/components/profile/PlayerAvatar";
import { RankBadge } from "@/components/profile/RankBadge";
import { Stage, StageRows } from "@/components/Stage";

interface LeaderboardRow {
  place: number;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  rating: number;
  gamesRated: number;
}

interface LeaderboardScreenProps {
  /** Best first, already placed. */
  rows: LeaderboardRow[];
  /** The viewer's username when they are on the list, so their row is picked out in gold. */
  own: string | null;
}

/** Every rated player in order. Tapping a row goes to that player's profile. */
export function LeaderboardScreen({ rows, own }: LeaderboardScreenProps) {
  return (
    <Stage>
      <StageRows>
        <div className="flex h-full min-h-0 flex-col gap-2">
          <h1 className="text-center font-display text-base font-black tracking-widest text-gold-400 uppercase">
            Leaderboard
          </h1>
          {rows.length === 0 ? (
            <p className="m-auto text-base font-bold text-cosmos-300">
              Nobody is ranked yet. Rank moves in private games with two or more people.
            </p>
          ) : (
            <ol className="scroll-fade flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {rows.map((row) => (
                <li key={row.username}>
                  <Link
                    href={`/profile/${row.username}`}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-1 hover:brightness-125",
                      row.username === own ? "bg-gold-200 text-cosmos-950" : "bg-cosmos-800",
                    )}
                  >
                    <span className="w-8 text-center text-xl font-black tabular-nums">{row.place}</span>
                    <PlayerAvatar src={row.avatarUrl} name={row.username} className="size-8 text-xs" />
                    <span className="min-w-0 flex-1 truncate text-base font-bold">{row.name ?? row.username}</span>
                    <RankBadge rating={row.rating} />
                    <span
                      className="flex items-center gap-3 rounded-full bg-cosmos-950 px-3 py-1 text-sm font-black text-white tabular-nums"
                      title={`${row.gamesRated} rated games`}
                    >
                      {row.rating}
                      <span className="text-cosmos-300">{row.gamesRated}g</span>
                    </span>
                  </Link>
                </li>
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
