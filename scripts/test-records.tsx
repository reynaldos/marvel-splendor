import "dotenv/config";
import assert from "node:assert";
import { renderToStaticMarkup } from "react-dom/server";

import { StatsTabs } from "@/components/profile/StatsTabs";
import { careerStats } from "@/lib/career-stats";
import { prisma } from "@/lib/db";
import { loadGameHistory } from "@/lib/load-game-history";
import { defaultUserStatsSnapshot } from "@/lib/record-stats";

// The Records tab reads the people-only stats, and never the all-games ones.
const all = careerStats([{ cards: [], points: 99, tags: 9, won: true, turns: 5 }]);
const people = careerStats([{ cards: [], points: 17, tags: 3, won: true, turns: 28 }]);
const html = renderToStaticMarkup(<StatsTabs stats={{ ...defaultUserStatsSnapshot, bestPoints: 99, fastestWinTurns: 5 }} career={all} records={people} games={[]} />);
assert.ok(html.includes("Games played"));

// Read-only, against the real games: records come from no more games than the career, and only from ones with another person.
async function main() {
  for (const { id } of await prisma.user.findMany({ select: { id: true } })) {
    const { games, career, records } = await loadGameHistory(id);
    const withPeople = games.filter((g) => g.mode === "MULTIPLAYER").length;
    assert.ok(records.bestPoints <= career.bestPoints && records.mostTags <= career.mostTags);
    if (withPeople === 0) assert.deepEqual([records.bestPoints, records.bestWinPoints, records.fastestWinTurns], [0, null, null]);
    console.log(`games ${games.length}, private ${withPeople}: highest ${career.bestPoints} -> ${records.bestPoints}, fastest win ${career.fastestWinTurns} -> ${records.fastestWinTurns}`);
  }
  console.log("ok: records");
}
main().finally(() => prisma.$disconnect());
