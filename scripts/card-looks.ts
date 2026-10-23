// Reads every pictured card that has no look yet into data/card-looks.json, so a
// squad pic never waits on OpenAI for a card. A card already in the file is skipped.
//
//   pnpm looks:backfill
//
// Runs against OPENAI_API_KEY from .env. About a cent a card.
import "dotenv/config";
import { readFile } from "node:fs/promises";

import { ALL_CARDS } from "@/lib/engine/data";
import { describeCards } from "@/lib/squad-looks";

const BATCH = 8;

async function known(): Promise<Set<string>> {
  return new Set(Object.keys(JSON.parse(await readFile("data/card-looks.json", "utf8").catch(() => "{}"))));
}

async function main() {
  const have = await known();
  const todo = ALL_CARDS.filter((c) => c.image && !have.has(c.id));
  console.log(`${have.size} cards have looks, ${todo.length} to read`);
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    await describeCards(batch);
    console.log(`${Math.min(i + BATCH, todo.length)}/${todo.length} ${batch.map((c) => c.name).join(", ")}`);
  }
  console.log(`done: ${(await known()).size} cards have looks`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
