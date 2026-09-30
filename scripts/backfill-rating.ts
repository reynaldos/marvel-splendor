// Sets every player's rank from the multiplayer games already played to the end.
// Everyone starts at the default rating, then each game is rated in the order it
// finished, so later games use the ratings earlier ones produced. Games with
// fewer than two signed-in humans don't count, as they never did. It sets the
// rank to what the games say, so it can be run again at any time.
//
//   pnpm rating:backfill            show what would be saved (changes nothing)
//   pnpm rating:backfill --verbose  also show every rated game in order, with each player's swing
//   pnpm rating:backfill --yes      save it
//
// Runs against DATABASE_URL from .env.
import "dotenv/config";

import { prisma } from "@/lib/db";
import type { GameState } from "@/lib/engine/types";
import { rankPlayers } from "@/lib/game-record";
import { defaultRatingSnapshot, nextRatings, type RatedPlayer, type RatingSnapshot } from "@/lib/rating";

async function main() {
  const games = await prisma.game.findMany({
    where: { status: "FINISHED", mode: "MULTIPLAYER" },
    orderBy: { updatedAt: "asc" },
    select: {
      updatedAt: true,
      state: true,
      players: {
        where: { isBot: false, userId: { not: null } },
        select: { seat: true, userId: true, user: { select: { username: true } } },
      },
    },
  });

  console.log(`Database: ${new URL(process.env.DATABASE_URL!).hostname}`);
  const rated = games.filter((g) => g.players.length >= 2);
  const usernames = new Map(rated.flatMap((g) => g.players.map((p) => [p.userId!, p.user!.username])));
  const verbose = process.argv.includes("--verbose");
  const ratings = new Map<string, RatingSnapshot>();
  for (const game of rated) {
    const ranked = rankPlayers(game.state as unknown as GameState, []);
    const players: RatedPlayer[] = game.players.map(({ seat, userId }) => ({
      ...(ratings.get(userId!) ?? defaultRatingSnapshot),
      userId: userId!,
      place: ranked.find((r) => r.seat === seat)!.place,
    }));
    const next = nextRatings(players);
    for (const { userId, ...snapshot } of next) ratings.set(userId, snapshot);

    if (!verbose) continue;
    console.log(`\n${game.updatedAt.toISOString().slice(0, 16).replace("T", " ")}  ${players.length} players`);
    for (const p of [...players].sort((a, b) => a.place - b.place)) {
      const after = next.find((n) => n.userId === p.userId)!.rating;
      const swing = after - p.rating;
      console.log(`  ${p.place}. ${usernames.get(p.userId)!.padEnd(16)} ${p.rating} → ${after}  (${swing >= 0 ? "+" : ""}${swing})`);
    }
  }
  if (verbose) console.log();

  const rows = [...ratings].map(([userId, snapshot]) => ({ userId, ...snapshot }));
  console.log(`${games.length} finished multiplayer games, ${rated.length} rated, ${rows.length} players ranked`);
  for (const row of rows.sort((a, b) => b.rating - a.rating)) {
    console.log(`  ${usernames.get(row.userId)}  ${row.rating}  (${row.gamesRated} rated games)`);
  }

  if (!process.argv.includes("--yes")) {
    console.log("\nNothing was changed. Run again with --yes to save the above.");
    return;
  }

  // Players with no rated games go back to the default, so stale rows never outlive the games behind them.
  await prisma.$transaction([
    prisma.userRating.deleteMany({ where: { userId: { notIn: rows.map((r) => r.userId) } } }),
    ...rows.map((row) => prisma.userRating.upsert({ where: { userId: row.userId }, create: row, update: row })),
  ]);
  console.log(`\nSaved. The table now holds ${await prisma.userRating.count()} ranked players.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
