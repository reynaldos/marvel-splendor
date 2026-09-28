"use client";

import { useOptimistic, useState } from "react";
import { cn } from "cn";
import { ChevronDown } from "lucide-react";

import { BOT_DIFFICULTIES, type BotDifficulty } from "@/lib/engine/types";

interface BotLevelProps {
  level: BotDifficulty;
  /** Receives the chosen level as the form's `difficulty`. */
  action: (formData: FormData) => Promise<void>;
}

/** A bot's level on one pill; tapping it opens the choices, which may be wider than the seat. */
export function BotLevel({ level, action }: BotLevelProps) {
  const [open, setOpen] = useState(false);
  // Shows the pick at once, without waiting for the server to confirm it.
  const [shown, setShown] = useOptimistic(level);

  return (
    <form
      action={async (formData) => {
        const picked = BOT_DIFFICULTIES.find((d) => d === formData.get("difficulty"));
        if (picked) setShown(picked);
        await action(formData);
      }}
      onSubmit={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
      className="relative flex h-7 justify-center"
    >
      {open ? (
        <>
          {/* Phones don't blur a tapped button, so a tap anywhere else lands here. */}
          <button
            type="button"
            aria-label="Close"
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-0 left-1/2 z-20 flex -translate-x-1/2 gap-0.5 rounded-full bg-cosmos-950 p-0.5 shadow-lg ring-2 ring-gold-400 ring-inset">
            {BOT_DIFFICULTIES.map((option) => (
              <button
                key={option}
                type="submit"
                name="difficulty"
                value={option}
                aria-pressed={option === shown}
                className={cn(
                  "h-6 rounded-full px-3 text-xs font-bold uppercase",
                  option === shown ? "bg-gold-400 text-cosmos-950" : "text-cosmos-300 hover:text-white",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      ) : (
        <button
          type="button"
          aria-expanded={false}
          aria-label={`Bot level: ${shown}. Tap to change`}
          onClick={() => setOpen(true)}
          className="flex h-7 items-center gap-1 rounded-full bg-cosmos-950 pr-2 pl-3 text-xs font-bold text-gold-200 uppercase ring-2 ring-cosmos-500 ring-inset"
        >
          {shown}
          <ChevronDown className="size-4" />
        </button>
      )}
    </form>
  );
}
