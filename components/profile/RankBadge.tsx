import { cn } from "cn";
import { Medal } from "lucide-react";

const BADGE =
  "flex h-7 items-center gap-1.5 rounded-full bg-cosmos-900 px-3 text-xs font-black ring-2 ring-cosmos-500 ring-inset tabular-nums";

interface RankBadgeProps {
  /** Null before a player's first rated game (multiplayer, 2+ humans). */
  rating: number | null;
  className?: string;
}

/** Rating as a small badge, not the player-card frame — rank can go down, the frame shouldn't. The number itself: no tiers. */
export function RankBadge({ rating, className }: RankBadgeProps) {
  return (
    <span className={cn(BADGE, rating === null ? "text-cosmos-400" : "text-gold-400", className)} title="Rating">
      <Medal className="size-4" />
      {rating ?? "Unranked"}
    </span>
  );
}
