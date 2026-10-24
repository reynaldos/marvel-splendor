import { cn } from "cn";

import { FoilLayer } from "@/components/Foil";
import { CardView } from "@/components/game/Card";
import { PlayerAvatar } from "@/components/profile/PlayerAvatar";
import { LeaderboardRow } from "@/components/profile/LeaderboardScreen";
import { RankBadge } from "@/components/profile/RankBadge";
import { Stage } from "@/components/Stage";
import { CARD_LEVEL_TIER_MIN_TIMES } from "@/lib/card-level";
import { CARD_BY_ID } from "@/lib/engine/data";
import { FRAME_EFFECT, FRAME_STYLE, FRAME_TIER_NAMES } from "@/lib/frame-tier";
import { pageMetadata } from "@/lib/site";
import { AVATAR_LIBRARY } from "@/lib/avatars";
import { ACCOUNT_FRAME_TIER_MIN_LEVEL, scoreForLevel } from "@/lib/xp";

import { PreviewMenu } from "../PreviewBar";

export const metadata = pageMetadata("Tiers preview", undefined, true);

const HEADING = "font-display text-xs font-black tracking-widest text-gold-400 uppercase";
const NOTE = "fs-2xs font-bold text-cosmos-300 tabular-nums";
const THANOS = CARD_BY_ID.get("c3-21")!;
const LEADERBOARD = [
  {
    place: 1,
    username: "rival",
    level: 8,
    xp: 1852,
    avatarUrl: AVATAR_LIBRARY[1].src,
    avatarTier: "Gold" as const,
    rating: 1240,
    gamesRated: 18,
  },
  { place: 2, username: "you", level: 4, xp: 520, avatarUrl: AVATAR_LIBRARY[2].src, avatarTier: "Sapphire" as const, rating: 1180, gamesRated: 9 },
];

/** Every frame tier and rank badge side by side, with what earns each, to look at without earning them. */
export default function TiersPreviewPage() {
  return (
    <Stage>
      <div className="flex h-100 w-full flex-col justify-center gap-2 px-4 pb-5">
        <section className="relative flex flex-col gap-2">
          <FoilLayer tight />
          <h2 className={HEADING}>Frames · player card by account level, card by times recruited</h2>
          <ul className="flex gap-2">
            {FRAME_TIER_NAMES.map((tier, i) => (
              <li
                key={tier}
                className="flex flex-1 flex-col items-center gap-0.5 text-center"
                style={FRAME_STYLE[tier]}
              >
                <div className="frame-gold flex h-20 w-16 flex-col items-center justify-center gap-0.5 rounded-2xl px-1">
                  <PlayerAvatar src={null} name="Tier Preview" tier={tier} className="size-8 text-xs" />
                  <span className="w-full truncate fs-2xs font-black text-gold-400">Player</span>
                  <span className="fs-3xs font-bold text-cosmos-300">Level {ACCOUNT_FRAME_TIER_MIN_LEVEL[i]}</span>
                </div>
                <div className={cn("frame-gold relative aspect-card w-14 rounded-frame", FRAME_EFFECT[tier])}>
                  <CardView card={THANOS} className="size-full" />
                  <span className="gem-badge absolute -top-1.5 -right-1.5 z-10 flex h-6 min-w-6 items-center justify-center px-1 fs-2xs font-black text-white tabular-nums">
                    ×{CARD_LEVEL_TIER_MIN_TIMES[THANOS.level][i]}
                  </span>
                </div>
                <span className="text-xs font-black">{tier}</span>
                <span className={NOTE}>
                  Lv {ACCOUNT_FRAME_TIER_MIN_LEVEL[i]} · ×{CARD_LEVEL_TIER_MIN_TIMES[THANOS.level][i]}
                </span>
                <span className={NOTE}>{scoreForLevel(ACCOUNT_FRAME_TIER_MIN_LEVEL[i])} XP</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className={HEADING}>Rank · the rating itself, no tiers: the badge, and the leaderboard rows</h2>
          <div className="flex items-center gap-4">
            <RankBadge rating={null} />
            <RankBadge rating={1000} />
            <ol className="flex flex-1 flex-col gap-1.5">
              {LEADERBOARD.map((row) => (
                <LeaderboardRow key={row.username} row={row} own="you" />
              ))}
            </ol>
          </div>
        </section>
      </div>
      <PreviewMenu />
    </Stage>
  );
}
