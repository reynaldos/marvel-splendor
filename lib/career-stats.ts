import { CARD_BY_ID } from "@/lib/engine/data";

/** How one finished game ended for a player. */
export interface FinishedGame {
  /** Recruited card ids. */
  cards: string[];
  points: number;
  /** Avengers tags held at the end. */
  tags: number;
  won: boolean;
  /** Turns the game lasted. */
  turns: number;
}

export interface MostUsed {
  name: string;
  times: number;
}

export interface CareerStats {
  heroes: number;
  villains: number;
  mostUsedHero: MostUsed | null;
  mostUsedVillain: MostUsed | null;
  averageWinPoints: number | null;
  bestWinPoints: number | null;
  lowestLossPoints: number | null;
  averageTags: number | null;
  mostTags: number;
  /** The most points in any game, won or lost. */
  bestPoints: number;
  /** The fewest turns a win has taken. */
  fastestWinTurns: number | null;
}

function average(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** The most recruited of the counted cards; a tie goes to the first by name. */
function mostUsed(times: Map<string, number>): MostUsed | null {
  const [top] = [...times].sort(([a, x], [b, y]) => y - x || a.localeCompare(b));
  return top ? { name: top[0], times: top[1] } : null;
}

/** A player's stats across their finished games. A card that is "both" counts once as each. */
export function careerStats(games: FinishedGame[]): CareerStats {
  const heroes = new Map<string, number>();
  const villains = new Map<string, number>();
  for (const id of games.flatMap((g) => g.cards)) {
    // A card since taken out of the deck is left out.
    const card = CARD_BY_ID.get(id);
    if (!card) continue;
    if (card.side !== "villain") heroes.set(card.name, (heroes.get(card.name) ?? 0) + 1);
    if (card.side !== "hero") villains.set(card.name, (villains.get(card.name) ?? 0) + 1);
  }
  const total = (times: Map<string, number>) => [...times.values()].reduce((sum, n) => sum + n, 0);
  const wins = games.filter((g) => g.won);
  const winPoints = wins.map((g) => g.points);
  const lossPoints = games.filter((g) => !g.won).map((g) => g.points);

  return {
    heroes: total(heroes),
    villains: total(villains),
    mostUsedHero: mostUsed(heroes),
    mostUsedVillain: mostUsed(villains),
    averageWinPoints: average(winPoints),
    bestWinPoints: winPoints.length ? Math.max(...winPoints) : null,
    lowestLossPoints: lossPoints.length ? Math.min(...lossPoints) : null,
    averageTags: average(games.map((g) => g.tags)),
    mostTags: Math.max(0, ...games.map((g) => g.tags)),
    bestPoints: Math.max(0, ...games.map((g) => g.points)),
    fastestWinTurns: wins.length ? Math.min(...wins.map((g) => g.turns)) : null,
  };
}
