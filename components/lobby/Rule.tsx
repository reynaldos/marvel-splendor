import type { ReactNode } from "react";

/** A setting, shown as its icon beside a gold label over its value. */
export function Rule({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <span className="flex items-center gap-2">
      {icon}
      <span className="flex flex-col gap-0.5">
        <span className="font-display text-xs font-bold tracking-wide text-gold-400 uppercase">{label}</span>
        <span className="text-xl leading-none font-black">{value}</span>
      </span>
    </span>
  );
}
