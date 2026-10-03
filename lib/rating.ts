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

/** Places for rows already sorted by score, highest first. Equal scores share a place: 1, 2, 2, 4. */
export function placeBy<T>(rows: T[], score: (row: T) => number): Array<T & { place: number }> {
  let place = 0;
  return rows.map((row, i) => {
    if (i === 0 || score(rows[i - 1]) !== score(row)) place = i + 1;
    return { ...row, place };
  });
}
