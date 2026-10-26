import { getDuelCard } from "@/lib/duel/data";
import { CARD_BY_ID } from "@/lib/engine/data";
import type { FrameTier } from "@/lib/frame-tier";
import { isDuel, rankable, type AnyState } from "@/lib/game-rules";

/** The parts of a finished game's state `rankPlayers` reads — satisfied by both `GameState` and a live `RedactedGameState`. */
export interface RankableState {
  players: Array<{ seat: number; points: number; cards: string[]; tags: number }>;
  winnerSeat: number | null;
  sharedWinners: number[] | null;
}

export interface RankedPlayer {
  seat: number;
  name: string;
  avatarUrl: string | null;
  points: number;
  cards: number;
  /** Avengers badges held at the end. */
  tags: number;
  won: boolean;
  /** 1 for every winner; the rest follow in order. */
  place: number;
}

/** One finished game, as the player whose record it is saw it end. */
export interface GameRecord {
  id: string;
  mode: "VS_BOT" | "MULTIPLAYER";
  /** When it ended, in milliseconds. */
  endedAt: number;
  seat: number;
  won: boolean;
  place: number;
  rounds: number;
  /** Cards recruited at level 1, 2 and 3. */
  cardsByLevel: [number, number, number];
  /** The ids of the cards the player recruited. */
  team: string[];
  /** Everyone at the table, best first. */
  players: RankedPlayer[];
  /** By seat, for the players whose rewards are saved. */
  rewards: Array<[seat: number, rewards: GameRewards]>;
}

/** What a finished game gave one player, saved on their seat so the results can show it any time. */
export interface GameRewards {
  /** Only for a rated game: 2+ signed-in humans, multiplayer. */
  rating?: { before: number; after: number };
  coins: number;
  /** Account score, which the level and frame come from. */
  xp: { before: number; after: number };
  /** Cards whose level went up in this game; `from` is null for one recruited for the first time. */
  cardLevelUps: Array<{ cardId: string; from: FrameTier | null; to: FrameTier }>;
}

export interface Seated {
  seat: number;
  name: string;
  avatarUrl: string | null;
}

/** Winners first, then by points; level on points, the one with fewer cards is ahead. */
export function rankPlayers(state: RankableState, seated: Seated[]): RankedPlayer[] {
  const ranked = state.players
    .map((p) => ({
      seat: p.seat,
      name: seated.find((s) => s.seat === p.seat)?.name ?? `Seat ${p.seat + 1}`,
      avatarUrl: seated.find((s) => s.seat === p.seat)?.avatarUrl ?? null,
      points: p.points,
      cards: p.cards.length,
      tags: p.tags,
      won: state.winnerSeat === p.seat || (state.sharedWinners?.includes(p.seat) ?? false),
    }))
    .sort((a, b) => Number(b.won) - Number(a.won) || b.points - a.points || a.cards - b.cards);
  const winners = ranked.filter((p) => p.won).length;
  return ranked.map((p, i) => ({ ...p, place: p.won ? 1 : Math.max(i + 1, winners + 1) }));
}

/** Null when the seat isn't in the game. */
export function gameRecord(
  game: { id: string; mode: GameRecord["mode"]; endedAt: number; state: AnyState; rewards: GameRecord["rewards"] },
  seat: number,
  seated: Seated[],
): GameRecord | null {
  const record = rankable(game.state);
  const players = rankPlayers(record, seated);
  const mine = players.find((p) => p.seat === seat);
  if (!mine) return null;
  const duel = isDuel(game.state);
  const team = record.players[seat].cards;
  const levels = team.map((id) => (duel ? getDuelCard(id).level : CARD_BY_ID.get(id)?.level));
  return {
    id: game.id,
    mode: game.mode,
    endedAt: game.endedAt,
    seat,
    won: mine.won,
    place: mine.place,
    // A Duel has no rounds; its turns are counted two to a round.
    rounds: isDuel(game.state) ? Math.ceil(game.state.moveCount / 2) : game.state.round,
    team,
    cardsByLevel: [1, 2, 3].map((level) => levels.filter((l) => l === level).length) as [number, number, number],
    players,
    rewards: game.rewards,
  };
}

const AGO: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 86_400_000],
  ["month", 30 * 86_400_000],
  ["week", 7 * 86_400_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** "5 days ago", "2 weeks ago". */
export function timeAgo(then: number, now = Date.now()): string {
  const passed = now - then;
  const [unit, size] = AGO.find(([, ms]) => passed >= ms) ?? ["minute", 60_000];
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-Math.floor(passed / size), unit);
}

/** "1st", "2nd", "3rd", "4th". */
export function ordinal(place: number): string {
  return `${place}${["th", "st", "nd", "rd"][place] ?? "th"}`;
}
