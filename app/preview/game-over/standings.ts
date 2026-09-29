// Kept apart from the screen, so the page can read the list of results on the server.
import type { RankedPlayer } from "@/lib/game-record";

export const RESULTS = ["win", "loss", "shared"] as const;
export type Result = (typeof RESULTS)[number];

// A made-up table, best first. The viewer is "You".
const TABLE = [
  { name: "You", avatarUrl: "/assets/pfp/pfp-iron-man.jpg", points: 17, cards: 14, tags: 4 },
  { name: "maryanmi", avatarUrl: "/assets/pfp/pfp-scarlet-witch.jpg", points: 15, cards: 12, tags: 2 },
  { name: "Bot 1", avatarUrl: null, points: 11, cards: 10, tags: 3 },
  { name: "Bot 2", avatarUrl: null, points: 8, cards: 9, tags: 1 },
];

/** The made-up standings for a result: on a loss the viewer comes second, and a shared win has two winners. */
export function standingsFor(result: Result, players: number): { standings: RankedPlayer[]; viewerSeat: number } {
  const winners = result === "shared" ? 2 : 1;
  const seats = TABLE.slice(0, players).map((player, seat) => ({ ...player, seat }));
  // On a loss someone else takes the top row, and its score.
  if (result === "loss") [seats[0], seats[1]] = [{ ...seats[1], points: 17 }, { ...seats[0], points: 15 }];
  return {
    viewerSeat: 0,
    standings: seats.map((player, i) => ({
      ...player,
      points: i < winners ? 17 : player.points,
      won: i < winners,
      place: i < winners ? 1 : Math.max(i + 1, winners + 1),
    })),
  };
}
