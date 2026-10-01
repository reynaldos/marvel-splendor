import { cn } from "cn";

/** An on/off switch drawn in the theme's colours. */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <label className="flex h-11 items-center justify-between gap-3 rounded-full bg-cosmos-950 pr-2 pl-5 text-base font-bold ring-2 ring-cosmos-500 ring-inset">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          on ? "bg-gold-400" : "bg-cosmos-700",
        )}
      >
        <span
          className={cn(
            "absolute top-1 left-1 size-5 rounded-full transition-transform",
            on ? "translate-x-5 bg-cosmos-950" : "bg-cosmos-300",
          )}
        />
      </button>
    </label>
  );
}
