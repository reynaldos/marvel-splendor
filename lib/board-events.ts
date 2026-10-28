import type { TokenColor } from "@/lib/engine/types";
import type { AnyMove } from "@/lib/game-rules";

/** Something worth stopping the game to show everyone. */
export type BoardEvent =
  | { kind: "timeStone"; seat: number }
  | { kind: "avengers"; seat: number; /** Who held the tile before, if anyone. */ from: number | null }
  | { kind: "location"; seat: number; locationId: string }
  | { kind: "royal"; seat: number; royalId: string }
  /** A Privilege spent by `seat`; or, with `from`, one `seat` took from the other player, the table being bare. */
  | { kind: "privilege"; seat: number; from?: number }
  | { kind: "steal"; seat: number; from: number; color: TokenColor };

/** The parts of a board the events are read from; both the full and the redacted state fit. */
interface Table {
  players: Array<{ seat: number; tokens: { time: number }; locations: string[] }>;
  avengersHolder: number | null;
}

/** The parts of a Duel table the events are read from. */
interface DuelTable {
  players: Array<{ seat: number; royals: string[]; privileges: number }>;
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

/** What a Duel move brought about: a stone stolen, a Privilege spent or taken from the other player, then the Royal cards it earned. */
export function duelEvents(before: DuelTable, after: DuelTable, move?: { seat: number; move: AnyMove }): BoardEvent[] {
  const stolen: BoardEvent[] = move?.move.type === "PICK_OPPONENT_TOKEN" ? [{ kind: "steal", seat: move.seat, from: 1 - move.seat, color: move.move.color }] : [];
  return stolen.concat(after.players.flatMap((player) => {
    const was = before.players.find((p) => p.seat === player.seat);
    const events: BoardEvent[] = [];
    if (was && player.privileges < was.privileges) {
      // The mover's own drops as they spend one; anyone else's was taken by the mover, there being none on the table.
      const spent = move?.move.type === "SPEND_PRIVILEGE" && move.seat === player.seat;
      events.push(spent ? { kind: "privilege", seat: player.seat } : { kind: "privilege", seat: 1 - player.seat, from: player.seat });
    }
    const held = was?.royals ?? [];
    for (const royalId of player.royals) if (!held.includes(royalId)) events.push({ kind: "royal", seat: player.seat, royalId });
    return events;
  }));
}

/** True for a move that picks something off the board, which can be outlined before it goes. */
export function leavesATrace(move: AnyMove): boolean {
  return ["TAKE_TOKENS", "RESERVE", "RECRUIT", "TAKE_LINE", "BUY"].includes(move.type);
}
