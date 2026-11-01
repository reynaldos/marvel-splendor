import type { CSSProperties } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";

import { BackLink } from "@/components/BackLink";
import { FoilLayer } from "@/components/Foil";
import { LevelBadge } from "@/components/profile/LevelBadge";
import { ownFrame, PlayerAvatar } from "@/components/profile/PlayerAvatar";
import { RankBadge } from "@/components/profile/RankBadge";
import { StatsTabs } from "@/components/profile/StatsTabs";
import { Stage, StageRows } from "@/components/Stage";
import type { CareerStats } from "@/lib/career-stats";
import { FRAME_STYLE } from "@/lib/frame-tier";
import type { GameRecord } from "@/lib/game-record";
import type { UserStatsSnapshot } from "@/lib/record-stats";
import { accountFrameTier, accountLevel } from "@/lib/xp";

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
  /** Account XP, which the level and frame come from. */
  xp: number;
  career: CareerStats;
  records: CareerStats;
  /** Null when the viewer may not see them: only the player and admins can. */
  games: GameRecord[] | null;
  isOwn: boolean;
  /** An admin may edit any profile; the link then names whose. */
  canEdit: boolean;
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
  xp,
  career,
  records,
  games,
  isOwn,
  canEdit,
}: ProfileScreenProps) {
  const level = accountLevel(xp);
  const tier = accountFrameTier(level);

  return (
    <Stage>
      <StageRows>
        {/* On a screen taller than a phone the stats panel grows, up to a point. */}
        <div className="flex items-end gap-6 tall:max-h-88 tall:min-h-0 tall:flex-1">
          <div
            // On a taller screen it stands as tall as the stats panel, under the row of tabs.
            className="frame-gold relative flex h-62 w-52 shrink-0 flex-col items-center justify-center gap-0 rounded-3xl px-3 text-center pt-3 tall:mt-8 tall:h-auto tall:self-stretch"
            style={xpCardStyle ? FRAME_STYLE[tier] : PLAIN_FRAME}
            title={`Level ${level}`}
          >
            <FoilLayer tight />
            {canEdit ? (
              <Link
                href={isOwn ? "/settings" : `/settings?user=${username}`}
                aria-label="Edit profile"
                className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500"
              >
                <Pencil className="size-5" />
              </Link>
            ) : null}
            <PlayerAvatar
              src={avatarUrl}
              name={username}
              // The switches are the player's own view of their own picture; everyone else sees the full frame.
              {...(isOwn ? ownFrame(tier, xpAvatarStyle, xpCardStyle) : { tier })}
              // On the taller card the picture and names sit midway, the badges keep the foot.
              className="size-24 text-4xl tall:mt-auto"
            />
            <p className="w-full truncate text-xl font-black text-gold-400">{name ?? username}</p>
            {name ? <p className="w-full truncate text-sm font-bold">@{username}</p> : null}
            <div className="mt-auto mb-3 flex flex-wrap items-center justify-center gap-1.5">
              <RankBadge rating={rating} />
              <LevelBadge level={level} score={xp} />
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
