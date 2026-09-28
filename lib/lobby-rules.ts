/** What the host can pick from; tapping a setting steps to the next value. */
export const POINT_OPTIONS = [16, 18, 21];
export const TURN_TIME_OPTIONS = [30, 60, 90];

/** The value after `current`, wrapping round; anything not on the list starts it over. */
export function nextOption(options: number[], current: number | null): number {
  return options[(options.indexOf(current ?? NaN) + 1) % options.length];
}

/** People first, then bots, each in the order they sat down. */
export function tableOrder<T extends { seat: number; isBot: boolean }>(players: T[]): T[] {
  return [...players].sort((a, b) => Number(a.isBot) - Number(b.isBot) || a.seat - b.seat);
}

/** "Bot 1", "Bot 2"…, counted in seat order, so a bot keeps its name from the lobby into the game. */
export function botName(players: Array<{ seat: number; isBot: boolean }>, seat: number): string {
  return `Bot ${players.filter((p) => p.isBot && p.seat <= seat).length}`;
}
