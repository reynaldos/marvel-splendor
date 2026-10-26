import type { SfxName } from "@/lib/audio-tracks";
import { boardEvents, duelEvents, leavesATrace, type BoardEvent } from "@/lib/board-events";
import { isAway } from "@/lib/engine/types";
import { isDuel, type AnyMove, type AnyState } from "@/lib/game-rules";

/** How long the "Your turn" banner shows; the turn's clock starts once it has gone. */
export const TURN_BANNER_MS = 1700;
/** How long what another player picked is outlined before it leaves the board: the time the outline takes to be drawn and taken up. */
export const TRACE_MS = 1500;
/** How long each bot appears to think before its move lands. */
export const BOT_THINK_MS = 3500;

/** How long an announcement holds the screen. The Eye takes its time to open. */
export function announceMs(event: BoardEvent): number {
  return event.kind === "timeStone" ? 5000 : event.kind === "privilege" || event.kind === "steal" ? 2000 : 3000;
}

/** The sound an announcement opens with. A Royal comes in as a Location does; a Privilege spent is a tap. */
export const announceSfx = (event: BoardEvent): SfxName => (event.kind === "royal" ? "location" : event.kind === "privilege" || event.kind === "steal" ? "tap" : event.kind);

/** What a move brought about, in whichever game is on the table. */
function eventsOf(before: AnyState, after: AnyState): BoardEvent[] {
  if (isDuel(before) && isDuel(after)) return duelEvents(before, after);
  if (isDuel(before) || isDuel(after)) return [];
  return boardEvents(before, after);
}

/**
 * How long the next player's device spends showing a move before their turn
 * can begin: the mover's thinking or the outline on their pick, then each
 * announcement. The turn clock waits this long before it starts.
 */
export function playbackMs(before: AnyState, seat: number, move: AnyMove, after: AnyState, bot: boolean): number {
  const mover = bot || isAway(after.players[seat]) ? BOT_THINK_MS : leavesATrace(move) ? TRACE_MS : 0;
  return eventsOf(before, after).reduce((ms, event) => ms + announceMs(event), mover);
}
