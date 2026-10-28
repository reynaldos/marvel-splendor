import { Fragment } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { duelArt, royalTile } from "@/components/duel/duel-art";
import { getCard, getLocation } from "@/lib/engine/data";
import { tokenMeta } from "@/components/game/stone-colors";
import type { BoardEvent } from "@/lib/board-events";
import type { RoyalTiles } from "@/lib/duel/types";
import type { TokenColor } from "@/lib/engine/types";
import type { AnyMove } from "@/lib/game-rules";

export interface MoveLogEntry {
  id: string;
  seat: number;
  move: AnyMove;
  /** For a Duel line, the tokens it took, known only when the board was on screen. */
  tokens?: TokenColor[];
  /** Full rounds completed when the move was made. */
  round?: number;
  /** The mover's points right after. */
  points?: number;
  /** What the move won: a Location, the Avengers tile, the Time Stone. */
  events?: BoardEvent[];
  /** For sequencing bot moves visually; not a real server timestamp. */
  timestamp: number;
}

interface MoveLogProps {
  entries: MoveLogEntry[];
  players: Array<{ seat: number; name: string }>;
  viewerSeat: number;
  /** The Location tile each Royal wears in this Duel. */
  royalTiles?: RoyalTiles;
  className?: string;
}

/** Scrollable move list, newest first, with a bar at the start of each round. */
export function MoveLog({ entries, players, viewerSeat, royalTiles, className }: MoveLogProps) {
  const newestFirst = [...entries].reverse();
  return (
    <div className={className}>
      <ScrollArea className="h-[65dvh] rounded-xl bg-cosmos-950/60 p-3 ring-2 ring-cosmos-500 ring-inset">
        <ol className="flex flex-col gap-1.5">
          {entries.length === 0 ? (
            <li className="text-base text-cosmos-300">No moves yet.</li>
          ) : (
            newestFirst.map((entry, i) => {
              // The bar sits above the newest move of each round, so it reads as that round's heading.
              const startsRound = entry.round !== undefined && newestFirst[i - 1]?.round !== entry.round;
              return (
                <Fragment key={entry.id}>
                  {startsRound && (
                    <li className="my-1 flex items-center gap-2 text-[10px] font-bold tracking-widest text-cosmos-300 uppercase">
                      <span className="h-px flex-1 bg-cosmos-500" />
                      Round {(entry.round ?? 0) + 1}
                      <span className="h-px flex-1 bg-cosmos-500" />
                    </li>
                  )}
                  <li className="text-base">
                    {describeMove(entry, players, viewerSeat, royalTiles)}
                    {describeEvents(entry, players, viewerSeat, royalTiles).map((line) => (
                      <span key={line} className="block text-sm text-gold-400">
                        {line}
                      </span>
                    ))}
                  </li>
                </Fragment>
              );
            })
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

/** One line per thing the move won. A chosen Location is already the move itself. */
export function describeEvents(
  entry: MoveLogEntry,
  players: Array<{ seat: number; name: string }>,
  viewerSeat: number,
  royalTiles?: RoyalTiles,
): string[] {
  const who = seatLabel(entry.seat, players, viewerSeat);
  return (entry.events ?? []).flatMap((event) => {
    switch (event.kind) {
      case "timeStone":
        return `${who} took the Time Stone`;
      case "avengers":
        return event.from === null
          ? `${who} took the Avengers Assemble tile`
          : `${who} stole the Avengers Assemble tile from ${seatLabel(event.from, players, viewerSeat)}`;
      case "location":
        return entry.move.type === "CHOOSE_LOCATION" ? [] : `${who} claimed ${getLocation(event.locationId).name}`;
      case "royal":
        return entry.move.type === "PICK_ROYAL" ? [] : `${who} claimed ${royalTile(event.royalId, royalTiles).name}`;
      case "privilege":
        return event.from === undefined ? [] : `${who} took a Privilege from ${seatLabel(event.from, players, viewerSeat)}`;
      case "steal":
        return [];
    }
  });
}

/** A Duel card goes by the Marvel picture it wears. */
function cardLabel(cardId: string): string {
  const card = cardId.startsWith("d") ? duelArt(cardId) : getCard(cardId);
  return `${card.name} (Lv${card.level})`;
}

export function describeMove(
  entry: MoveLogEntry,
  players: Array<{ seat: number; name: string }>,
  viewerSeat: number,
  royalTiles?: RoyalTiles,
): string {
  const name = seatLabel(entry.seat, players, viewerSeat);
  const who = entry.points === undefined ? name : `${name} (${entry.points}★)`;
  const move = entry.move;

  switch (move.type) {
    case "TAKE_TOKENS":
      return `${who} took ${move.colors.map((c) => tokenMeta(c).label).join(", ")}`;
    case "RESERVE":
      return move.from === "deck"
        ? `${who} reserved a card blind from the Level ${move.level} deck`
        : `${who} reserved ${cardLabel(move.cardId)}`;
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
    case "TAKE_LINE":
      return entry.tokens
        ? `${who} took ${entry.tokens.map((c) => tokenMeta(c).label).join(", ")}`
        : `${who} took ${move.spaces.length} stone${move.spaces.length === 1 ? "" : "s"}`;
    case "BUY":
      return `${who} recruited ${cardLabel(move.cardId)}`;
    case "SPEND_PRIVILEGE":
      return `${who} spent a Privilege`;
    case "REFILL":
      return `${who} refilled the board`;
    case "PICK_TOKEN":
      return `${who} took a stone`;
    case "PICK_OPPONENT_TOKEN":
      return `${who} took a ${tokenMeta(move.color).label} stone from their opponent`;
    case "PICK_JOIN_COLOR":
      return `${who}'s wild card joined ${tokenMeta(move.color).label}`;
    case "PICK_ROYAL":
      return `${who} claimed ${royalTile(move.royalId, royalTiles).name}`;
    default:
      return `${who} made a move.`;
  }
}
