import { describe, expect, it } from "vitest";

import { gameRecord, ordinal, rankPlayers, timeAgo } from "@/lib/game-record";

import { makePlayer, makeState } from "./engine/helpers";

const seated = ["Ana", "Ben", "Cy"].map((name, seat) => ({ seat, name, avatarUrl: null }));
const finished = (over: Parameters<typeof makeState>[1]) => makeState(3, { status: "finished", round: 28, ...over });

describe("rankPlayers", () => {
  it("puts the winner first, then the rest by points", () => {
    const state = finished({
      winnerSeat: 1,
      players: [makePlayer(0, { points: 12 }), makePlayer(1, { points: 17 }), makePlayer(2, { points: 15 })],
    });
    expect(rankPlayers(state, seated).map((p) => [p.name, p.place])).toEqual([
      ["Ben", 1],
      ["Cy", 2],
      ["Ana", 3],
    ]);
  });

  it("puts the winner first even when another player has more points", () => {
    const state = finished({
      winnerSeat: 0,
      players: [makePlayer(0, { points: 16 }), makePlayer(1, { points: 18 }), makePlayer(2, { points: 3 })],
    });
    expect(rankPlayers(state, seated).map((p) => p.name)).toEqual(["Ana", "Ben", "Cy"]);
  });

  it("breaks a tie on points by fewer cards", () => {
    const state = finished({
      winnerSeat: 2,
      players: [
        makePlayer(0, { points: 10, cards: ["a", "b", "c"] }),
        makePlayer(1, { points: 10, cards: ["a"] }),
        makePlayer(2, { points: 16 }),
      ],
    });
    expect(rankPlayers(state, seated).map((p) => p.name)).toEqual(["Cy", "Ben", "Ana"]);
  });

  it("gives every shared winner first place, and the next player third", () => {
    const state = finished({
      winnerSeat: null,
      sharedWinners: [0, 2],
      players: [makePlayer(0, { points: 16 }), makePlayer(1, { points: 9 }), makePlayer(2, { points: 16 })],
    });
    expect(rankPlayers(state, seated).map((p) => [p.name, p.place, p.won])).toEqual([
      ["Ana", 1, true],
      ["Cy", 1, true],
      ["Ben", 3, false],
    ]);
  });
});

describe("gameRecord", () => {
  const state = finished({
    winnerSeat: 1,
    players: [makePlayer(0, { points: 12 }), makePlayer(1, { points: 17 }), makePlayer(2, { points: 15 })],
  });
  const game = { id: "g1", mode: "MULTIPLAYER" as const, endedAt: 0, state };

  it("is told from the seat it belongs to", () => {
    expect(gameRecord(game, 0, seated)).toMatchObject({ won: false, place: 3, rounds: 28, seat: 0 });
    expect(gameRecord(game, 1, seated)).toMatchObject({ won: true, place: 1 });
    const withCards = finished({ winnerSeat: 0, players: [makePlayer(0, { cards: ["a", "b"] }), makePlayer(1), makePlayer(2)] });
    expect(gameRecord({ ...game, state: withCards }, 0, seated)?.team).toEqual(["a", "b"]);
  });
  it("is nothing for a seat that wasn't in the game", () => {
    expect(gameRecord(game, 3, seated)).toBeNull();
  });
});

describe("wording", () => {
  it("counts places", () => {
    expect([1, 2, 3, 4].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th"]);
  });
  it("says how long ago in the largest whole unit", () => {
    const day = 86_400_000;
    expect(timeAgo(0, 5 * day)).toBe("5 days ago");
    expect(timeAgo(0, 15 * day)).toBe("2 weeks ago");
    expect(timeAgo(0, 3 * 3_600_000)).toBe("3 hours ago");
    expect(timeAgo(0, 1000)).toBe("this minute");
  });
});
