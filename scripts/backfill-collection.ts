// Fills each player's collection from the games already played to the end.
// Abandoned games don't count, nor do cards recruited by the bot standing in
// for a player who was away. It sets each count to what the games say, so it
// can be run again at any time and gives the same answer.
//
//   pnpm collection:backfill          show what would be saved (changes nothing)
//   pnpm collection:backfill --yes    save it
//
// Runs against DATABASE_URL from .env. The table must be there first:
// prisma/sql/2026-09-29-collected-cards.sql
import "dotenv/config";

import { cardsRecruited } from "@/lib/collection";
import { prisma } from "@/lib/db";
import type { Move } from "@/lib/engine/types";
import { writeCollected } from "@/lib/save-collection";

async function main() {
  const games = await prisma.game.findMany({
    where: { status: "FINISHED" },
    orderBy: { updatedAt: "asc" },
    select: {
      updatedAt: true,
      players: { where: { isBot: false, userId: { not: null } }, select: { seat: true, userId: true } },
      moves: { orderBy: { ordinal: "asc" }, select: { seat: true, payload: true } },
    },
  });

  // Per player, per card: how many times, and when first.
  const collections = new Map<string, Map<string, { times: number; firstFoundAt: Date }>>();
  for (const game of games) {
    const recruited = cardsRecruited(game.moves.map((m) => ({ seat: m.seat, move: m.payload as unknown as Move })));
    for (const { seat, userId } of game.players) {
      const mine = collections.get(userId!) ?? new Map();
      for (const [cardId, times] of recruited.get(seat) ?? []) {
        const had = mine.get(cardId);
        mine.set(cardId, { times: (had?.times ?? 0) + times, firstFoundAt: had?.firstFoundAt ?? game.updatedAt });
      }
      collections.set(userId!, mine);
    }
  }

  const rows = [...collections].flatMap(([userId, cards]) => [...cards].map(([cardId, card]) => ({ userId, cardId, ...card })));
  console.log(`Database: ${new URL(process.env.DATABASE_URL!).hostname}`);
  console.log(`${games.length} finished games, ${collections.size} players, ${rows.length} cards to save`);
  console.log("different cards per player:", [...collections.values()].map((c) => c.size).join(", ") || "none");

  if (!process.argv.includes("--yes")) {
    console.log("\nNothing was changed. Run again with --yes to save the above.");
    return;
  }

  await writeCollected(rows, "set");
  console.log(`\nSaved. The table now holds ${await prisma.collectedCard.count()} cards.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
