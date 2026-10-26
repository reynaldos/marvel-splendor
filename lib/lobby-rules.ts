import { createRng, shuffle } from "@/lib/engine/rng";

/** What the host can pick from; tapping a setting steps to the next value. */
export const POINT_OPTIONS = [16, 18, 21];
export const TURN_TIME_OPTIONS = [30, 60, 90];
export const GAME_CLOCK_OPTIONS = [10, 20, 30];

/** The value after `current`, wrapping round; anything not on the list starts it over. */
export function nextOption<T>(options: readonly T[], current: T | null): T {
  return options[(options.indexOf(current as T) + 1) % options.length];
}

/** A submitted game clock: one of the choices on offer, else no clock. */
export function clockOf(value: FormDataEntryValue | null): number | null {
  return GAME_CLOCK_OPTIONS.find((o) => o === Number(value)) ?? null;
}

/** People first, then bots, each in the order they sat down. */
export function tableOrder<T extends { seat: number; isBot: boolean }>(players: T[]): T[] {
  return [...players].sort((a, b) => Number(a.isBot) - Number(b.isBot) || a.seat - b.seat);
}

/** The lobby's players dealt into random seats; bots keep their lobby numbering so "Bot 2" stays "Bot 2". */
export function dealSeats<T extends { seat: number; isBot: boolean }>(players: T[], seed: string): T[] {
  const bots = players.filter((p) => p.isBot).sort((a, b) => a.seat - b.seat);
  return shuffle(players, createRng(`${seed}:seats`)).map((p) => (p.isBot ? (bots.shift() ?? p) : p));
}

/** "Bot 1", "Bot 2"…, counted in seat order, so a bot keeps its name from the lobby into the game. */
export function botName(players: Array<{ seat: number; isBot: boolean }>, seat: number): string {
  return `Bot ${players.filter((p) => p.isBot && p.seat <= seat).length}`;
}
