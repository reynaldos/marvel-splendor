import assert from "node:assert/strict";

import { accountFrameTier, accountLevel, accountScore } from "@/lib/xp";
import { defaultUserStatsSnapshot, type UserStatsSnapshot } from "@/lib/record-stats";

const stats = (over: Partial<UserStatsSnapshot>): UserStatsSnapshot => ({ ...defaultUserStatsSnapshot, ...over });

// Score formula: gamesPlayed*10 + wins*20 + avengersTilesWon*5 + locationsClaimed*5
assert.equal(accountScore(stats({ gamesPlayed: 3, wins: 1, avengersTilesWon: 2, locationsClaimed: 4 })), 3 * 10 + 1 * 20 + 2 * 5 + 4 * 5);

// Level thresholds from ARCHITECTURE.md
const levelTable: Array<[number, number]> = [
  [0, 1], [99, 1], [100, 2], [282, 2], [283, 3], [519, 3], [520, 4],
  [799, 4], [800, 5], [1117, 5], [1118, 6], [1469, 6], [1470, 7],
  [1851, 7], [1852, 8], [2262, 8], [2263, 9], [2699, 9], [2700, 10],
];
for (const [score, expected] of levelTable) assert.equal(accountLevel(score), expected, `score ${score}`);

// Frame tier boundaries from ARCHITECTURE.md
const tierTable: Array<[number, string]> = [
  [1, "Recruited"], [2, "Bronze"], [3, "Bronze"], [4, "Silver"], [5, "Silver"],
  [6, "Gold"], [8, "Gold"], [9, "Platinum"], [11, "Platinum"], [12, "Diamond"],
  [15, "Diamond"], [16, "Prismatic"], [20, "Prismatic"], [21, "Mastered"], [50, "Mastered"],
];
for (const [level, expected] of tierTable) assert.equal(accountFrameTier(level), expected, `level ${level}`);

console.log("xp.ts: all assertions passed");
