import { boardEvents, leavesATrace, type BoardEvent } from "@/lib/board-events";
import { isAway, type GameState, type Move } from "@/lib/engine/types";

/** How long the "Your turn" banner shows; the turn's clock starts once it has gone. */
export const TURN_BANNER_MS = 1700;
/** How long what another player picked is outlined before it leaves the board: the time the outline takes to be drawn and taken up. */
export const TRACE_MS = 1500;
/** How long each bot appears to think before its move lands. */
export const BOT_THINK_MS = 3500;

/** How long an announcement holds the screen. The Eye takes its time to open. */
export function announceMs(event: BoardEvent): number {
  return event.kind === "timeStone" ? 5000 : 3000;
}

/**
 * How long the next player's device spends showing a move before their turn
 * can begin: the mover's thinking or the outline on their pick, then each
 * announcement. The turn clock waits this long before it starts.
 */
export function playbackMs(before: GameState, seat: number, move: Move, after: GameState, bot: boolean): number {
  const mover = bot || isAway(after.players[seat]) ? BOT_THINK_MS : leavesATrace(move) ? TRACE_MS : 0;
  return boardEvents(before, after).reduce((ms, event) => ms + announceMs(event), mover);
}
