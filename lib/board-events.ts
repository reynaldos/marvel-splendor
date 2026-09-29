import type { Move } from "@/lib/engine/types";

/** Something worth stopping the game to show everyone. */
export type BoardEvent =
  | { kind: "timeStone"; seat: number }
  | { kind: "avengers"; seat: number; /** Who held the tile before, if anyone. */ from: number | null }
  | { kind: "location"; seat: number; locationId: string };

/** The parts of a board the events are read from; both the full and the redacted state fit. */
interface Table {
  players: Array<{ seat: number; tokens: { time: number }; locations: string[] }>;
  avengersHolder: number | null;
}

/** What a move brought about, in the order the rules award it: Time Stone, Avengers tile, Location. */
export function boardEvents(before: Table, after: Table): BoardEvent[] {
  const events: BoardEvent[] = [];
  const was = (seat: number) => before.players.find((p) => p.seat === seat);

  for (const player of after.players) {
    if (player.tokens.time > (was(player.seat)?.tokens.time ?? 0)) events.push({ kind: "timeStone", seat: player.seat });
  }
  if (after.avengersHolder !== null && after.avengersHolder !== before.avengersHolder) {
    events.push({ kind: "avengers", seat: after.avengersHolder, from: before.avengersHolder });
  }
  for (const player of after.players) {
    const held = was(player.seat)?.locations ?? [];
    for (const locationId of player.locations) {
      if (!held.includes(locationId)) events.push({ kind: "location", seat: player.seat, locationId });
    }
  }
  return events;
}

/** True for a move that picks something off the board, which can be outlined before it goes. */
export function leavesATrace(move: Move): boolean {
  return move.type === "TAKE_TOKENS" || move.type === "RESERVE" || move.type === "RECRUIT";
}
