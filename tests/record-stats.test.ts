import { describe, expect, it } from "vitest";

import {
  defaultUserStatsSnapshot,
  nextUserStats,
  type PlayerGameOutcome,
} from "@/lib/record-stats";

function outcome(overrides: Partial<PlayerGameOutcome>): PlayerGameOutcome {
  return {
    userId: "user-1",
    isWinner: false,
    points: 0,
    turns: 0,
    wonAvengersTile: false,
    locationsClaimed: 0,
    ...overrides,
  };
}

describe("nextUserStats", () => {
  it("always increments gamesPlayed, win or lose", () => {
    const lost = nextUserStats(defaultUserStatsSnapshot, outcome({ isWinner: false }), "MULTIPLAYER");
    expect(lost.gamesPlayed).toBe(1);
    expect(lost.wins).toBe(0);

    const won = nextUserStats(defaultUserStatsSnapshot, outcome({ isWinner: true }), "MULTIPLAYER");
    expect(won.gamesPlayed).toBe(1);
    expect(won.wins).toBe(1);
  });

  it("only credits vsBotWins for a win in VS_BOT mode", () => {
    const wonVsBot = nextUserStats(defaultUserStatsSnapshot, outcome({ isWinner: true }), "VS_BOT");
    expect(wonVsBot.wins).toBe(1);
    expect(wonVsBot.vsBotWins).toBe(1);

    const wonMultiplayer = nextUserStats(defaultUserStatsSnapshot, outcome({ isWinner: true }), "MULTIPLAYER");
    expect(wonMultiplayer.wins).toBe(1);
    expect(wonMultiplayer.vsBotWins).toBe(0);

    const lostVsBot = nextUserStats(defaultUserStatsSnapshot, outcome({ isWinner: false }), "VS_BOT");
    expect(lostVsBot.vsBotWins).toBe(0);
  });

  it("tracks bestPoints as a running maximum, win or lose", () => {
    const first = nextUserStats(defaultUserStatsSnapshot, outcome({ points: 12 }), "MULTIPLAYER");
    expect(first.bestPoints).toBe(12);

    const higher = nextUserStats(first, outcome({ points: 20 }), "MULTIPLAYER");
    expect(higher.bestPoints).toBe(20);

    const lower = nextUserStats(higher, outcome({ points: 5 }), "MULTIPLAYER");
    expect(lower.bestPoints).toBe(20);
  });

  it("only sets fastestWinTurns on a win, and tracks a running minimum", () => {
    const lossDoesNothing = nextUserStats(
      defaultUserStatsSnapshot,
      outcome({ isWinner: false, turns: 3 }),
      "MULTIPLAYER"
    );
    expect(lossDoesNothing.fastestWinTurns).toBeNull();

    const firstWin = nextUserStats(defaultUserStatsSnapshot, outcome({ isWinner: true, turns: 30 }), "MULTIPLAYER");
    expect(firstWin.fastestWinTurns).toBe(30);

    const fasterWin = nextUserStats(firstWin, outcome({ isWinner: true, turns: 18 }), "MULTIPLAYER");
    expect(fasterWin.fastestWinTurns).toBe(18);

    const slowerWin = nextUserStats(fasterWin, outcome({ isWinner: true, turns: 40 }), "MULTIPLAYER");
    expect(slowerWin.fastestWinTurns).toBe(18);
  });

  it("increments avengersTilesWon and locationsClaimed cumulatively", () => {
    const step1 = nextUserStats(
      defaultUserStatsSnapshot,
      outcome({ wonAvengersTile: true, locationsClaimed: 2 }),
      "MULTIPLAYER"
    );
    expect(step1.avengersTilesWon).toBe(1);
    expect(step1.locationsClaimed).toBe(2);

    const step2 = nextUserStats(
      step1,
      outcome({ wonAvengersTile: false, locationsClaimed: 1 }),
      "MULTIPLAYER"
    );
    expect(step2.avengersTilesWon).toBe(1);
    expect(step2.locationsClaimed).toBe(3);
  });

  it("does not mutate the previous snapshot", () => {
    const prev = { ...defaultUserStatsSnapshot, bestPoints: 10 };
    const frozen = Object.freeze({ ...prev });
    expect(() => nextUserStats(frozen, outcome({ points: 20 }), "MULTIPLAYER")).not.toThrow();
    expect(frozen.bestPoints).toBe(10);
  });
});
