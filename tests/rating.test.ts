import { describe, expect, it } from "vitest";

import { defaultRatingSnapshot, nextRatings, type RatedPlayer } from "@/lib/rating";

const player = (over: Partial<RatedPlayer>): RatedPlayer => ({
  userId: "u",
  rating: 1000,
  gamesRated: 0,
  place: 1,
  ...over,
});

describe("nextRatings", () => {
  it("moves nobody when there's only one human in the game", () => {
    const solo = [player({ userId: "a" })];
    expect(nextRatings(solo)).toEqual([{ userId: "a", rating: 1000, gamesRated: 0 }]);
  });

  it("gives the winner and loser equal and opposite swings when ratings match", () => {
    const players = [
      player({ userId: "a", place: 1 }),
      player({ userId: "b", place: 2 }),
    ];
    const [a, b] = nextRatings(players);
    expect(a).toEqual({ userId: "a", rating: 1020, gamesRated: 1 });
    expect(b).toEqual({ userId: "b", rating: 980, gamesRated: 1 });
  });

  it("pays more for beating a higher-rated opponent than a same-rated one", () => {
    const evenWin = nextRatings([player({ userId: "a", rating: 1000, place: 1 }), player({ userId: "b", rating: 1000, place: 2 })]);
    const upsetWin = nextRatings([
      player({ userId: "a", rating: 1007, gamesRated: 1, place: 1 }),
      player({ userId: "b", rating: 1100, place: 2 }),
    ]);
    expect(evenWin[0].rating - 1000).toBeLessThan(upsetWin[0].rating - 1007);
  });

  it("uses the provisional K-factor for a player's first 15 rated games, then a lower one", () => {
    const provisional = nextRatings([player({ userId: "a", gamesRated: 14, place: 1 }), player({ userId: "b", place: 2 })]);
    const established = nextRatings([player({ userId: "a", gamesRated: 15, place: 1 }), player({ userId: "b", place: 2 })]);
    expect(provisional[0].rating - 1000).toBe(20);
    expect(established[0].rating - 1000).toBe(10);
  });

  it("scores a 4-player placement as a round-robin against every opponent", () => {
    const players = [
      player({ userId: "a", place: 1 }),
      player({ userId: "b", place: 2 }),
      player({ userId: "c", place: 3 }),
      player({ userId: "d", place: 4 }),
    ];
    const [, b] = nextRatings(players);
    // 2nd of 4, all even: loses to 1st, beats 3rd and 4th — a small net gain.
    expect(b).toEqual({ userId: "b", rating: 1007, gamesRated: 1 });
  });

  it("scores a shared-victory tie as a draw between the co-winners", () => {
    const players = [
      player({ userId: "a", place: 1 }),
      player({ userId: "b", place: 1 }),
      player({ userId: "c", place: 3 }),
    ];
    const [a, b] = nextRatings(players);
    // a and b tied for 1st (draw between them), both beat c: same rating, same result.
    expect(a.rating).toBe(b.rating);
    expect(a.rating).toBeGreaterThan(1000);
  });

  it("never drops a rating below the floor", () => {
    const players = [player({ userId: "a", rating: 100, gamesRated: 0, place: 2 }), player({ userId: "b", rating: 1600, place: 1 })];
    expect(nextRatings(players)[0].rating).toBe(100);
  });

  it("starts everyone unranked at the default snapshot", () => {
    expect(defaultRatingSnapshot).toEqual({ rating: 1000, gamesRated: 0 });
  });
});
