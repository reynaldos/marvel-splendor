import { describe, expect, it, vi } from "vitest";

vi.unmock("@/data/cards.json");

import { careerStats, type FinishedGame } from "@/lib/career-stats";
import { ALL_CARDS } from "@/lib/engine/data";

const idOf = (name: string) => ALL_CARDS.find((c) => c.name === name)!.id;
const game = (over: Partial<FinishedGame>): FinishedGame => ({ cards: [], points: 0, tags: 0, won: false, ...over });

describe("careerStats", () => {
  it("has nothing to show before a game is finished", () => {
    expect(careerStats([])).toEqual({
      heroes: 0,
      villains: 0,
      mostUsedHero: null,
      mostUsedVillain: null,
      averageWinPoints: null,
      bestWinPoints: null,
      lowestLossPoints: null,
      averageTags: null,
      mostTags: 0,
    });
  });

  it("counts heroes and villains, and finds the most used of each", () => {
    const stats = careerStats([
      game({ cards: [idOf("Thor"), idOf("Loki"), idOf("Hulk")] }),
      game({ cards: [idOf("Thor"), idOf("Loki"), idOf("Thanos")] }),
      game({ cards: [idOf("Loki")] }),
    ]);
    expect(stats.heroes).toBe(3);
    expect(stats.villains).toBe(4);
    expect(stats.mostUsedHero).toEqual({ name: "Thor", times: 2 });
    expect(stats.mostUsedVillain).toEqual({ name: "Loki", times: 3 });
  });

  it("counts a card that is both once as each", () => {
    const stats = careerStats([game({ cards: [idOf("Venom")] })]);
    expect(stats.heroes).toBe(1);
    expect(stats.villains).toBe(1);
    expect(stats.mostUsedHero).toEqual({ name: "Venom", times: 1 });
    expect(stats.mostUsedVillain).toEqual({ name: "Venom", times: 1 });
  });

  it("gives a tie to the first by name", () => {
    expect(careerStats([game({ cards: [idOf("Thor"), idOf("Hulk")] })]).mostUsedHero?.name).toBe("Hulk");
  });

  it("leaves out a card that is no longer in the deck", () => {
    expect(careerStats([game({ cards: ["gone-01", idOf("Thor")] })]).heroes).toBe(1);
  });

  it("keeps points in wins apart from points in losses", () => {
    const stats = careerStats([
      game({ won: true, points: 16 }),
      game({ won: true, points: 21 }),
      game({ won: false, points: 9 }),
      game({ won: false, points: 14 }),
    ]);
    expect(stats.averageWinPoints).toBe(18.5);
    expect(stats.bestWinPoints).toBe(21);
    expect(stats.lowestLossPoints).toBe(9);
  });

  it("averages Avengers badges over every game, and keeps the most", () => {
    const stats = careerStats([game({ tags: 5 }), game({ tags: 0 }), game({ tags: 1 })]);
    expect(stats.averageTags).toBe(2);
    expect(stats.mostTags).toBe(5);
  });
});
