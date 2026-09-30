import type { CSSProperties } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";

import { BackLink } from "@/components/BackLink";
import { LevelBadge } from "@/components/profile/LevelBadge";
import { PlayerAvatar } from "@/components/profile/PlayerAvatar";
import { RankBadge } from "@/components/profile/RankBadge";
import { StatsTabs } from "@/components/profile/StatsTabs";
import { Stage, StageRows } from "@/components/Stage";
import type { CareerStats } from "@/lib/career-stats";
import { FRAME_STYLE } from "@/lib/frame-tier";
import type { GameRecord } from "@/lib/game-record";
import type { UserStatsSnapshot } from "@/lib/record-stats";
import { accountFrameTier, accountLevel, accountScore } from "@/lib/xp";

/** The card with the level frame turned off: the same blue border as the stats panel beside it. */
const PLAIN_FRAME = {
  "--frame-width": "3px",
  "--frame-border": "linear-gradient(var(--color-cosmos-500), var(--color-cosmos-500))",
} as CSSProperties;

interface ProfileScreenProps {
  username: string;
  name: string | null;
  avatarUrl: string | null;
  /** Null before a player's first rated game. */
  rating: number | null;
  /** Their own choice: the level frame on their picture, and on this card. */
  xpAvatarStyle: boolean;
  xpCardStyle: boolean;
  stats: UserStatsSnapshot;
  /** XP from card levels, on top of what the stats give. */
  cardXp: number;
  career: CareerStats;
  records: CareerStats;
  games: GameRecord[];
  isOwn: boolean;
}

/** A player's page: who they are on a card, beside how they have played. */
export function ProfileScreen({
  username,
  name,
  avatarUrl,
  rating,
  xpAvatarStyle,
  xpCardStyle,
  stats,
  cardXp,
  career,
  records,
  games,
  isOwn,
}: ProfileScreenProps) {
  const score = accountScore(stats, cardXp);
  const level = accountLevel(score);
  const tier = accountFrameTier(level);

  return (
    <Stage>
      <StageRows>
        <div className="flex items-end gap-6">
          <div
            className="frame-gold relative flex h-62 w-52 shrink-0 flex-col items-center justify-center gap-0 rounded-3xl px-3 text-center pt-3"
            style={xpCardStyle ? FRAME_STYLE[tier] : PLAIN_FRAME}
            title={`Level ${level}`}
          >
            {isOwn ? (
              <Link
                href="/settings"
                aria-label="Edit profile"
                className="absolute top-2 right-2 flex size-9 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500"
              >
                <Pencil className="size-5" />
              </Link>
            ) : null}
            <PlayerAvatar
              src={avatarUrl}
              name={username}
              tier={xpAvatarStyle ? tier : undefined}
              className="size-24 text-4xl"
            />
            <p className="w-full truncate text-xl font-black text-gold-400">{name ?? username}</p>
            {name ? <p className="w-full truncate text-sm font-bold">@{username}</p> : null}
            <div className="mt-auto mb-3 flex flex-wrap items-center justify-center gap-1.5">
              <RankBadge rating={rating} />
              <LevelBadge level={level} score={score} />
            </div>
          </div>
          <StatsTabs stats={stats} career={career} records={records} games={games} />
        </div>

        <footer className="flex items-center justify-between">
          <BackLink />
          <Link
            href={`/profile/${username}/collection`}
            className="flex h-11 items-center justify-center rounded-full bg-gold-400 px-10 indent-[0.025em] font-display text-base font-black tracking-wide text-cosmos-950 uppercase shadow-lg hover:bg-gold-200"
          >
            Collection
          </Link>
        </footer>
      </StageRows>
    </Stage>
  );
}
