import assert from "node:assert/strict";

import { cardFrameTier } from "@/lib/card-level";

// Tier boundaries from ARCHITECTURE.md ("Times recruited" row)
const table: Array<[number, string]> = [
  [1, "Recruited"], [4, "Recruited"], [5, "Bronze"], [9, "Bronze"], [10, "Silver"],
  [19, "Silver"], [20, "Gold"], [34, "Gold"], [35, "Platinum"], [54, "Platinum"],
  [55, "Diamond"], [79, "Diamond"], [80, "Prismatic"], [119, "Prismatic"], [120, "Mastered"], [500, "Mastered"],
];
for (const [times, expected] of table) assert.equal(cardFrameTier(times), expected, `times ${times}`);

console.log("card-level.ts: all assertions passed");
