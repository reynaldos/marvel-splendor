import Link from "next/link";
import { Pencil } from "lucide-react";

import { BackLink } from "@/components/BackLink";
import { PlayerAvatar } from "@/components/profile/PlayerAvatar";
import { StatsTabs } from "@/components/profile/StatsTabs";
import { Stage, StageRows } from "@/components/Stage";
import type { CareerStats } from "@/lib/career-stats";
import type { GameRecord } from "@/lib/game-record";
import type { UserStatsSnapshot } from "@/lib/record-stats";

interface ProfileScreenProps {
  username: string;
  name: string | null;
  avatarUrl: string | null;
  /** Already worded, such as "March 2026". */
  joined: string;
  stats: UserStatsSnapshot;
  career: CareerStats;
  games: GameRecord[];
  isOwn: boolean;
}

/** A player's page: who they are on a card, beside how they have played. */
export function ProfileScreen({ username, name, avatarUrl, joined, stats, career, games, isOwn }: ProfileScreenProps) {
  return (
    <Stage>
      <StageRows>
        <div className="flex items-end gap-6">
          <div className="frame-gold relative flex h-58 w-48 shrink-0 flex-col items-center justify-center gap-1 rounded-3xl px-3 text-center">
            {isOwn ? (
              <Link
                href="/settings"
                aria-label="Edit profile"
                className="absolute top-2 right-2 flex size-9 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500"
              >
                <Pencil className="size-5" />
              </Link>
            ) : null}
            <PlayerAvatar src={avatarUrl} name={username} className="mb-1 size-28 text-4xl" />
            <p className="w-full truncate text-xl font-black text-gold-400">{name ?? username}</p>
            {name ? <p className="w-full truncate text-sm font-bold">@{username}</p> : null}
            <p className="text-xs font-bold text-cosmos-300">Joined {joined}</p>
          </div>
          <StatsTabs stats={stats} career={career} games={games} />
        </div>

        <footer className="flex items-center justify-between">
          <BackLink />
            <Link
              href="/collection"
              className="flex h-11 items-center justify-center rounded-full bg-gold-400 px-10 indent-[0.025em] font-display text-base font-black tracking-wide text-cosmos-950 uppercase shadow-lg hover:bg-gold-200"
            >
              Collection
            </Link>
        </footer>
      </StageRows>
    </Stage>
  );
}
