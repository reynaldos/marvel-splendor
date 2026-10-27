// Sets what every finished game gave each player: for games that ended before
// rewards were saved, and to recount everyone's XP when its formula changes.
// Everything is replayed from scratch in the order the games ended — stats,
// rank, coins, collections and XP — the same way the live game and the rank and
// coins backfills do it (`lib/replay-records.ts`), so each game's before-and-after
// is what it would have been at the time. Only the rewards column is written.
//
//   pnpm rewards:backfill            show what would be saved and everyone's cards per tier (changes nothing)
//   pnpm rewards:backfill --verbose  also show every game in order, with each player's rewards
//   pnpm rewards:backfill --yes      save it
//
// Runs against DATABASE_URL from .env. The column must be there first:
// prisma/sql/2026-09-30-rewards.sql
import "dotenv/config";

import { cardFrameTier } from "@/lib/card-level";
import { prisma } from "@/lib/db";
import { CARD_BY_ID } from "@/lib/engine/data";
import { FRAME_TIER_NAMES } from "@/lib/frame-tier";
import { Prisma } from "@/lib/generated/prisma/client";
import { accountXpByUser } from "@/lib/load-xp";
import { loadFinishedGames, replayRecords } from "@/lib/replay-records";

async function main() {
  const verbose = process.argv.includes("--verbose");
  console.log(`Database: ${new URL(process.env.DATABASE_URL!).hostname}`);

  const games = await loadFinishedGames();
  const records = replayRecords(games);
  const users = await prisma.user.findMany({ select: { id: true, username: true } });
  const names = new Map(users.map((u) => [u.id, u.username]));
  const nameOf = (game: (typeof games)[number], seat: number) => names.get(game.players.find((p) => p.seat === seat)?.userId ?? "") ?? `seat ${seat + 1}`;

  if (verbose) {
    for (const game of games) {
      const seats = records.rewards.filter((r) => r.gameId === game.id);
      if (seats.length === 0) continue;
      console.log(`\n${game.updatedAt.toISOString().slice(0, 16).replace("T", " ")}  ${game.mode}`);
      for (const { seat, rewards } of seats) {
        const rating = rewards.rating ? `rank ${rewards.rating.before} → ${rewards.rating.after}` : "unrated";
        const ups = rewards.cardLevelUps.map((c) => `${c.cardId} ${c.from} → ${c.to}`).join(", ");
        console.log(`  ${nameOf(game, seat).padEnd(16)} ${rating.padEnd(22)} +${String(rewards.coins).padStart(2)} coins   xp ${rewards.xp.before} → ${rewards.xp.after}${ups ? `   ${ups}` : ""}`);
      }
    }
    console.log();
  }

  console.log(`${games.length} finished games, ${records.rewards.length} seats to save`);
  // The replay should land where the live game did; a difference means a game was rated or paid differently at the time.
  const [liveRatings, liveCoins] = await Promise.all([prisma.userRating.findMany(), prisma.coinTransaction.groupBy({ by: ["userId"], where: { reason: { startsWith: "game:" } }, _sum: { delta: true } })]);
  for (const [userId, { rating }] of records.ratings) {
    const live = liveRatings.find((r) => r.userId === userId)?.rating;
    if (live !== rating) console.log(`  rank differs for ${names.get(userId)}: replay ${rating}, database ${live ?? "none"}`);
  }
  const coins = new Map<string, number>();
  for (const c of records.coins) coins.set(c.userId, (coins.get(c.userId) ?? 0) + c.delta);
  for (const { userId, _sum } of liveCoins) {
    if ((coins.get(userId) ?? 0) !== (_sum.delta ?? 0)) console.log(`  coins differ for ${names.get(userId)}: replay ${coins.get(userId) ?? 0}, database ${_sum.delta}`);
  }

  // XP is expected to differ when its formula changed: this is what saving will set it to.
  const xp = new Map<string, number>();
  for (const { gameId, seat, rewards } of records.rewards) {
    const userId = games.find((g) => g.id === gameId)!.players.find((p) => p.seat === seat)!.userId!;
    xp.set(userId, rewards.xp.after);
  }
  const liveXp = await accountXpByUser([...xp.keys()]);
  console.log("\nXP, as saved → as replayed:");
  for (const [userId, total] of xp) console.log(`  ${(names.get(userId) ?? userId).padEnd(16)} ${String(liveXp.get(userId) ?? 0).padStart(6)} → ${String(total).padStart(6)}`);

  // Card tiers come from the collection counts, so they are not saved here; this is what the collection screen shows under the current ladders.
  console.log(`\nCards per tier (${FRAME_TIER_NAMES.map((t) => t.slice(0, 4)).join(" / ")}):`);
  for (const [userId, cards] of records.collections) {
    console.log(`  ${names.get(userId)}`);
    for (const level of [1, 2, 3] as const) {
      const count = Object.fromEntries(FRAME_TIER_NAMES.map((t) => [t, 0]));
      for (const [cardId, { times }] of cards) if (CARD_BY_ID.get(cardId)?.level === level) count[cardFrameTier(cardId, times)]++;
      console.log(`    level ${level}  ${FRAME_TIER_NAMES.map((t) => String(count[t]).padStart(4)).join("")}`);
    }
  }

  if (!process.argv.includes("--yes")) {
    console.log("\nNothing was changed. Run again with --yes to save the above.");
    return;
  }

  await prisma.$transaction(
    records.rewards.map((w) =>
      prisma.gamePlayer.update({
        where: { gameId_seat: { gameId: w.gameId, seat: w.seat } },
        data: { rewards: w.rewards as unknown as Prisma.InputJsonValue },
      }),
    ),
  );
  console.log(`\nSaved. ${await prisma.gamePlayer.count({ where: { rewards: { not: Prisma.DbNull } } })} seats now hold rewards.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
