import { cn } from "cn";
import { Sparkles } from "lucide-react";

const BADGE =
  "flex h-7 items-center gap-1.5 rounded-full bg-cosmos-900 px-3 text-xs font-black ring-2 ring-cosmos-500 ring-inset tabular-nums";

/** Account level and the XP behind it. Only ever climbs. */
export function LevelBadge({ level, score, className }: { level: number; score: number; className?: string }) {
  return (
    <span className={cn(BADGE, "text-gold-400", className)}>
      <Sparkles className="size-4" />
      Lv {level} · {score.toLocaleString()} XP
    </span>
  );
}
