import { Timer } from "lucide-react";
import { cn } from "cn";

/** A filled stopwatch. The outline is drawn again on top, or the fill would cover the hand. */
export function TimerIcon({ className }: { className?: string }) {
  return (
    <span className={cn("relative block", className)}>
      <Timer className="absolute size-full fill-gold-400 text-gold-600" />
      <Timer className="absolute size-full text-gold-600" />
    </span>
  );
}
