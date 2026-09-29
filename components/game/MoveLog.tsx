import { ScrollArea } from "@/components/ui/scroll-area";
import { getCard, getLocation } from "@/lib/engine/data";
import { tokenMeta } from "@/components/game/stone-colors";
import type { Move } from "@/lib/engine/types";

export interface MoveLogEntry {
  id: string;
  seat: number;
  move: Move;
  /** For sequencing bot moves visually; not a real server timestamp. */
  timestamp: number;
}

interface MoveLogProps {
  entries: MoveLogEntry[];
  players: Array<{ seat: number; name: string }>;
  viewerSeat: number;
  className?: string;
}

/** Scrollable recent-moves list (ARCHITECTURE.md §6) — plain client state, no realtime infra. */
export function MoveLog({ entries, players, viewerSeat, className }: MoveLogProps) {
  return (
    <div className={className}>
      <ScrollArea className="h-48 rounded-xl bg-cosmos-950/60 p-3 ring-2 ring-cosmos-500 ring-inset">
        <ol className="flex flex-col gap-1.5">
          {entries.length === 0 ? (
            <li className="text-sm text-cosmos-300">No moves yet.</li>
          ) : (
            entries.map((entry) => (
              <li key={entry.id} className="text-sm">
                {describeMove(entry, players, viewerSeat)}
              </li>
            ))
          )}
        </ol>
      </ScrollArea>
    </div>
  );
}

function seatLabel(seat: number, players: Array<{ seat: number; name: string }>, viewerSeat: number): string {
  if (seat === viewerSeat) return "You";
  return players.find((p) => p.seat === seat)?.name ?? `Seat ${seat}`;
}

function cardLabel(cardId: string): string {
  const card = getCard(cardId);
  return `${card.name} (Lv${card.level})`;
}

export function describeMove(
  entry: MoveLogEntry,
  players: Array<{ seat: number; name: string }>,
  viewerSeat: number,
): string {
  const who = seatLabel(entry.seat, players, viewerSeat);
  const move = entry.move;

  switch (move.type) {
    case "TAKE_TOKENS":
      return `${who} took ${move.colors.map((c) => tokenMeta(c).label).join(", ")}`;
    case "RESERVE":
      return move.from === "market"
        ? `${who} reserved ${cardLabel(move.cardId)}`
        : `${who} reserved a card blind from the Level ${move.level} deck`;
    case "RECRUIT":
      return `${who} recruited ${cardLabel(move.cardId)}`;
    case "RETURN_TOKENS": {
      const n = Object.values(move.tokens).reduce((sum, v) => sum + (v ?? 0), 0);
      return `${who} returned ${n} token${n === 1 ? "" : "s"}`;
    }
    case "CHOOSE_LOCATION":
      return `${who} claimed ${getLocation(move.locationId).name}`;
    case "TIMEOUT_SKIP":
      return `${who}'s turn was skipped`;
    case "REJOIN":
      return `${who} is back`;
    case "FORFEIT":
      return `${who} forfeited the game`;
    case "END_BY_CLOCK":
      return "The game clock expired — finishing the round.";
    default:
      return `${who} made a move.`;
  }
}
