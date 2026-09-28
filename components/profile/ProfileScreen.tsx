import Link from "next/link";

import { BackLink } from "@/components/BackLink";
import { Logo } from "@/components/home/Logo";
import { PlayerAvatar } from "@/components/profile/PlayerAvatar";
import { StatsGrid } from "@/components/profile/stats-grid";
import { Stage, StageRows } from "@/components/Stage";
import type { UserStatsSnapshot } from "@/lib/record-stats";

interface ProfileScreenProps {
  username: string;
  avatarUrl: string | null;
  /** Already worded, such as "March 2026". */
  joined: string;
  stats: UserStatsSnapshot;
  isOwn: boolean;
}

/** A player's page: who they are beside how they have played. */
export function ProfileScreen({ username, avatarUrl, joined, stats, isOwn }: ProfileScreenProps) {
  return (
    <Stage>
      <StageRows>
        <header className="flex items-center justify-between">
          <Logo className="text-3xl" />
          <h1 className="font-display text-2xl font-black tracking-widest text-gold-400 uppercase">Profile</h1>
        </header>

        <div className="flex items-center justify-around gap-6">
          <div className="flex w-44 flex-col items-center gap-2 text-center">
            <PlayerAvatar src={avatarUrl} name={username} className="size-28 text-4xl" />
            <p className="w-full truncate text-2xl font-black">{username}</p>
            <p className="text-xs font-bold text-cosmos-300">Joined {joined}</p>
          </div>
          <StatsGrid stats={stats} />
        </div>

        <footer className="flex items-center justify-between">
          <BackLink />
          {isOwn ? (
            <Link href="/settings" className="text-base font-bold text-gold-200 underline hover:text-gold-400">
              Edit profile
            </Link>
          ) : null}
        </footer>
      </StageRows>
    </Stage>
  );
}
