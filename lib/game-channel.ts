/** Pusher channel + event names, shared by the server trigger and the browser subscription. */
export const GAME_UPDATED_EVENT = "updated";

export function gameChannel(gameId: string): string {
  return `game-${gameId}`;
}
