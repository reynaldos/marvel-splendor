"use client";

import type { ReactNode } from "react";
import { cn } from "cn";

import { useNotchSide } from "@/components/use-notch-side";

/** The full-screen landscape canvas every menu screen is laid out on. */
export function Stage({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <main
      data-notch={useNotchSide()}
      className={cn("stage dark flex h-dvh w-full items-center overflow-hidden bg-cosmos text-white", className)}
    >
      {children}
    </main>
  );
}

/**
 * Fills the stage edge to edge, under the top bar: the content, then a footer
 * as the last thing in it. The content sits in the middle of the room between
 * the two, with as much space over it as under. Every menu screen is laid out
 * in one, so they all keep the same margins.
 */
export function StageRows({ children }: { children: ReactNode }) {
  // The top bar ends 14 steps down. The 3 more match the gap kept over the footer, so that
  // the content is never closer than that to either, and is level between them.
  return <div className="flex h-100 w-full flex-col gap-3 px-4 pt-17 pb-3 *:not-last:my-auto">{children}</div>;
}
