"use client";

import { createContext, useContext } from "react";

import type { AnyMove } from "@/lib/game-rules";

/** The move another player has just made, while what they picked is outlined on the board. */
export interface TracedMove {
  seat: number;
  move: AnyMove;
}

const TracedMoveContext = createContext<TracedMove | null>(null);

export const TracedMoveProvider = TracedMoveContext.Provider;

export function useTracedMove(): TracedMove | null {
  return useContext(TracedMoveContext);
}
