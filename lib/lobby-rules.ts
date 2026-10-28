import { createRng, shuffle } from "@/lib/engine/rng";

/** What the host can pick from; tapping a setting steps to the next value. */
export const POINT_OPTIONS = [16, 18, 21];
export const TURN_TIME_OPTIONS = [45, 60, 90];
export const GAME_CLOCK_OPTIONS = [10, 20, 30];

/** At most this many games a player may have open at once, lobbies included. */
export const MAX_OPEN_GAMES = 2;

/** A table where one person plays the bots: theirs to pause, and nobody else's to lose. */
export const playsBotsOnly = (players: Array<{ isBot: boolean }>): boolean => players.filter((p) => !p.isBot).length <= 1;

export type GameKind = "VS Computer" | "Private Game";
/** What a table is called: one person against the bots, or people playing each other, however many bots sit with them. */
export const kindOf = (players: Array<{ isBot: boolean }>): GameKind => (playsBotsOnly(players) ? "VS Computer" : "Private Game");

/** The stats' mode for a table: a win against bots alone counts as one, whatever mode the game row says. */
export const statsModeOf = (players: Array<{ isBot: boolean }>): "VS_BOT" | "MULTIPLAYER" => (playsBotsOnly(players) ? "VS_BOT" : "MULTIPLAYER");

/** The most of these games that were open at the same time: each from its creation to its last move, or to now while open. */
export function mostAtOnce(games: Array<{ status: string; createdAt: Date; updatedAt: Date }>, now: number): number {
  const open = (g: { status: string }) => g.status === "LOBBY" || g.status === "ACTIVE";
  const edges = games.flatMap((g) => [[g.createdAt.getTime(), 1], [open(g) ? now : g.updatedAt.getTime(), -1]] as const);
  // At the same instant a game closes before another opens.
  edges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let count = 0;
  let most = 0;
  for (const [, step] of edges) most = Math.max(most, (count += step));
  return most;
}

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
