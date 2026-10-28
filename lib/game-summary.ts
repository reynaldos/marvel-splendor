import type { RankedPlayer } from "@/lib/game-record";
import type { GameKind } from "@/lib/lobby-rules";

/** One game as the admin's tables show it, open or over. */
export interface GameSummary {
  id: string;
  status: "LOBBY" | "ACTIVE" | "FINISHED" | "ABANDONED";
  /** Against the bots alone, or with other people at the table. */
  kind: GameKind;
  /** A Duel, else the Marvel game. */
  duel: boolean;
  joinCode: string;
  /** Epoch ms. */
  createdAt: number;
  updatedAt: number;
  /** First move to last, in ms; 0 before the first. */
  playedMs: number;
  /** Open, and moved in recently enough to count as being played. */
  live: boolean;
  /** Open, and idle long enough that the sweep closes it. */
  dead: boolean;
  round: number;
  moves: number;
  /** Everyone at the table, in seat order. */
  players: string[];
  rules: { targetPoints: number; turnTimeSeconds: number | null };
  /** Best first; null in a lobby, where nothing has been dealt. */
  standings: RankedPlayer[] | null;
}

/** "12m", or "1h 5m". */
export function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
