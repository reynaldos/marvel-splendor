/** ELO-style rank from multiplayer games. Shown as a badge, not the player-card frame — rank can go down, the frame shouldn't. */

export interface RatingSnapshot {
  rating: number;
  gamesRated: number;
}

export const defaultRatingSnapshot: RatingSnapshot = { rating: 1000, gamesRated: 0 };

/** Games rated before a player's K-factor settles from provisional to established. */
const PROVISIONAL_GAMES = 15;
const PROVISIONAL_K = 40;
const ESTABLISHED_K = 20;
const RATING_FLOOR = 100;

function kFactor(gamesRated: number): number {
  return gamesRated < PROVISIONAL_GAMES ? PROVISIONAL_K : ESTABLISHED_K;
}

function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

/** 1 for finishing above `opponent`, 0 for below, 0.5 for a shared-victory tie. */
function actualScore(place: number, opponentPlace: number): number {
  if (place === opponentPlace) return 0.5;
  return place < opponentPlace ? 1 : 0;
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export interface RatedPlayer {
  userId: string;
  rating: number;
  gamesRated: number;
  /** From `rankPlayers()`: 1 for the winner(s), shared on a tie, the rest in order. */
  place: number;
}

/** New rating per player: pairwise round-robin off final placement. Caller ensures 2+ humans and excludes bots. */
export function nextRatings(
  players: RatedPlayer[],
): Array<{ userId: string; rating: number; gamesRated: number }> {
  if (players.length < 2) {
    return players.map(({ userId, rating, gamesRated }) => ({ userId, rating, gamesRated }));
  }

  return players.map((player) => {
    const opponents = players.filter((p) => p.userId !== player.userId);
    const delta =
      kFactor(player.gamesRated) *
      average(
        opponents.map(
          (o) => actualScore(player.place, o.place) - expectedScore(player.rating, o.rating),
        ),
      );

    return {
      userId: player.userId,
      rating: Math.max(RATING_FLOOR, Math.round(player.rating + delta)),
      gamesRated: player.gamesRated + 1,
    };
  });
}

const RANK_TIERS = [
  { name: "Rookie", min: -Infinity },
  { name: "Contender", min: 1000 },
  { name: "Veteran", min: 1200 },
  { name: "Elite", min: 1400 },
  { name: "Legend", min: 1600 },
] as const;

export type RankTier = (typeof RANK_TIERS)[number]["name"];

/** The badge tier a rating falls in. */
export function rankTierFor(rating: number): RankTier {
  let tier: RankTier = RANK_TIERS[0].name;
  for (const t of RANK_TIERS) if (rating >= t.min) tier = t.name;
  return tier;
}

/** Places for rows already sorted by rating, highest first. Equal ratings share a place: 1, 2, 2, 4. */
export function placeByRating<T extends { rating: number }>(rows: T[]): Array<T & { place: number }> {
  let place = 0;
  return rows.map((row, i) => {
    if (i === 0 || rows[i - 1].rating !== row.rating) place = i + 1;
    return { ...row, place };
  });
}
