// Kept apart from the screen, so the page can read the list of results on the server.
import type { GameRewards, RankedPlayer } from "@/lib/game-record";

export const RESULTS = ["win", "loss", "shared"] as const;
export type Result = (typeof RESULTS)[number];

// A made-up table, best first. The viewer is "You".
const TABLE = [
  { name: "You", avatarUrl: "/assets/pfp/pfp-iron-man.jpg", points: 17, cards: 14, tags: 4 },
  { name: "maryanmi", avatarUrl: "/assets/pfp/pfp-scarlet-witch.jpg", points: 15, cards: 12, tags: 2 },
  { name: "Bot 1", avatarUrl: null, points: 11, cards: 10, tags: 3 },
  { name: "Bot 2", avatarUrl: null, points: 8, cards: 9, tags: 1 },
];

/** How many cards the preview can show going up a level: the first `cards` of these. */
export const CARD_LEVEL_UPS: GameRewards["cardLevelUps"] = [
  { cardId: "c1-11", from: "Recruited", to: "Bronze" },
  { cardId: "c2-03", from: "Bronze", to: "Silver" },
  { cardId: "c3-01", from: "Silver", to: "Gold" },
  { cardId: "c1-01", from: "Gold", to: "Platinum" },
  { cardId: "c2-10", from: "Platinum", to: "Emerald" },
  { cardId: "c3-05", from: "Emerald", to: "Ruby" },
];

/** Made-up rewards for the two people at the table: a win is worth 18 rating and 50 coins, a loss costs 18 and pays 20; a shared win moves nobody. The viewer's XP crosses level 2, and `cards` of theirs go up a level. */
export function rewardsFor(standings: RankedPlayer[], cards: number): Map<number, GameRewards> {
  const winners = standings.filter((p) => p.won).length;
  return new Map(
    standings
      .filter((p) => p.avatarUrl)
      .map((p) => {
        const swing = p.won ? (winners > 1 ? 0 : 18) : -18;
        return [
          p.seat,
          {
            rating: { before: 1000, after: 1000 + swing },
            coins: p.won ? 50 : 20,
            xp: p.seat === 0 ? { before: 75, after: 120 } : { before: 250, after: 280 },
            cardLevelUps: p.seat === 0 ? CARD_LEVEL_UPS.slice(0, cards) : [],
          },
        ];
      }),
  );
}

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
