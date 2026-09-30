import { cn } from "cn";
import { Medal } from "lucide-react";

import { rankTierFor, type RankTier } from "@/lib/rating";

const TIER_COLOR: Record<RankTier, string> = {
  Rookie: "text-cosmos-300",
  Contender: "text-orange-300",
  Veteran: "text-slate-300",
  Elite: "text-gold-400",
  Legend: "text-fuchsia-300",
};

const BADGE = "flex h-7 items-center gap-1.5 rounded-full bg-cosmos-900 px-3 text-xs font-black ring-2 ring-cosmos-500 ring-inset";

interface RankBadgeProps {
  /** Null before a player's first rated game (multiplayer, 2+ humans). */
  rating: number | null;
  className?: string;
}

/** Rank as a small badge, not the player-card frame — rank can go down, the frame shouldn't. */
export function RankBadge({ rating, className }: RankBadgeProps) {
  if (rating === null) {
    return (
      <span className={cn(BADGE, "text-cosmos-400", className)}>
        <Medal className="size-4" />
        Unranked
      </span>
    );
  }

  const tier: RankTier = rankTierFor(rating);
  return (
    <span className={cn(BADGE, TIER_COLOR[tier], className)} title={`Rating ${rating}`}>
      <Medal className="size-4" />
      {tier}
    </span>
  );
}
