import type { ReactNode } from "react";
import { cn } from "cn";

/** A game option: its picture and name, over its value on a pill you tap to change. */
export function Option({
  icon,
  label,
  value,
  onNext,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onNext: () => void;
  /** The column's width, to fit more or fewer options in a row. */
  className?: string;
}) {
  return (
    <div className={cn("flex w-44 flex-col items-center gap-2", className)}>
      {icon}
      <span className="font-display text-base font-bold tracking-wide whitespace-nowrap text-gold-400 uppercase">
        {label}
      </span>
      <button
        type="button"
        onClick={onNext}
        aria-label={`${label}: ${value}. Tap to change`}
        className="h-11 w-full max-w-36 rounded-full bg-cosmos-950 text-xl font-black ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-700"
      >
        {value}
      </button>
    </div>
  );
}
