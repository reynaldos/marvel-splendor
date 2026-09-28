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

/** Fills the stage edge to edge: a header, the content, a footer. */
export function StageRows({ children }: { children: ReactNode }) {
  return <div className="flex h-100 w-full flex-col justify-between gap-4 px-6 py-5">{children}</div>;
}
