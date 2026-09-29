"use client";

import { useState, type ReactNode } from "react";
import { cn } from "cn";

/** Tabs in a row along the top, with the chosen one's view under them, as on the profile's stats. */
export function AdminTabs({ tabs }: { tabs: Array<{ name: string; view: ReactNode }> }) {
  const [open, setOpen] = useState(0);

  return (
    <div className="flex min-w-0 flex-col">
      <div role="tablist" className="flex gap-1 px-3">
        {tabs.map((tab, i) => (
          <button
            key={tab.name}
            type="button"
            role="tab"
            aria-selected={i === open}
            onClick={() => setOpen(i)}
            className={cn(
              "h-9 min-w-0 truncate rounded-t-xl px-4 text-sm font-black",
              i === open ? "bg-cosmos-500 text-white" : "bg-cosmos-800 text-cosmos-300 hover:text-white",
            )}
          >
            {tab.name}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="rounded-2xl bg-cosmos-950/80 p-3 ring-3 ring-cosmos-500 ring-inset">
        {tabs[open]?.view}
      </div>
    </div>
  );
}
