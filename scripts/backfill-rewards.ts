// Sets what every finished game gave each player, for games that ended before
// rewards were saved. Everything is replayed from scratch in the order the games
// ended — stats, rank, coins and collections — the same way the live game and
// the rank and coins backfills do it, so each game's before-and-after is what
// it would have been at the time. Only the rewards column is written.
//
//   pnpm rewards:backfill            show what would be saved (changes nothing)
//   pnpm rewards:backfill --verbose  also show every game in order, with each player's rewards
//   pnpm rewards:backfill --yes      save it
//
// Runs against DATABASE_URL from .env. The column must be there first:
// prisma/sql/2026-09-30-rewards.sql
import "dotenv/config";

import { BOT_COINS_DAILY_CAP, coinsForOutcome, isTurnPrimary, opponentTierFor } from "@/lib/coins";
import { cardsRecruited } from "@/lib/collection";
import { prisma } from "@/lib/db";
import type { GameSettings, GameState, Move } from "@/lib/engine/types";
import { rankPlayers } from "@/lib/game-record";
import { Prisma } from "@/lib/generated/prisma/client";
import { defaultRatingSnapshot, nextRatings, type RatingSnapshot } from "@/lib/rating";
import { buildGameRewards, type RewardSources } from "@/lib/record-rewards";
import { defaultUserStatsSnapshot, nextUserStats, type UserStatsSnapshot } from "@/lib/record-stats";
import { cardLevelXp } from "@/lib/xp";

async function main() {
  const games = await prisma.game.findMany({
    where: { status: "FINISHED" },
    orderBy: { updatedAt: "asc" },
    select: {
      id: true,
      mode: true,
      updatedAt: true,
      state: true,
      players: { select: { seat: true, isBot: true, userId: true, user: { select: { username: true } } } },
      moves: { orderBy: { ordinal: "asc" }, select: { seat: true, payload: true } },
    },
  });

  const verbose = process.argv.includes("--verbose");
  console.log(`Database: ${new URL(process.env.DATABASE_URL!).hostname}`);

  const stats = new Map<string, UserStatsSnapshot>();
  const ratings = new Map<string, RatingSnapshot>();
  const botCoinsByDay = new Map<string, number>();
  const coins = new Map<string, number>();
  const collections = new Map<string, Map<string, number>>();
  const writes: Array<{ gameId: string; seat: number; rewards: NonNullable<ReturnType<typeof buildGameRewards>> }> = [];

  for (const game of games) {
    const state = game.state as unknown as GameState;
    const humans = game.players.filter((p) => !p.isBot && p.userId);
    if (humans.length === 0) continue;
    const moves = game.moves.map((m) => ({ seat: m.seat, move: m.payload as unknown as Move }));
    const from: RewardSources = { stats: [], rating: [], coins: new Map(), cardXpBefore: new Map(), cards: [] };

    // Stats, as recordGameStats does it.
    for (const p of humans) {
      const seat = state.players[p.seat];
      const isWinner = state.winnerSeat === p.seat || (state.sharedWinners?.includes(p.seat) ?? false);
      const turns = moves.filter((m) => m.seat === p.seat && isTurnPrimary(m.move.type)).length;
      const prev = stats.get(p.userId!) ?? defaultUserStatsSnapshot;
      const next = nextUserStats(
        prev,
        { userId: p.userId!, isWinner, points: seat.points, turns, wonAvengersTile: state.avengersHolder === p.seat, locationsClaimed: seat.locations.length },
        game.mode,
      );
      stats.set(p.userId!, next);
      from.stats.push({ userId: p.userId!, prev, next });

      // Coins, as recordGameCoins does it: the daily cap on bot games runs per UTC day.
      const tier = opponentTierFor(state.settings as GameSettings, p.seat, game.players);
      let amount = coinsForOutcome(tier, isWinner, turns);
      if (tier !== "human" && amount > 0) {
        const day = `${p.userId}:${game.updatedAt.toISOString().slice(0, 10)}`;
        const today = botCoinsByDay.get(day) ?? 0;
        amount = Math.max(0, Math.min(amount, BOT_COINS_DAILY_CAP - today));
        botCoinsByDay.set(day, today + amount);
      }
      if (amount > 0) from.coins.set(p.userId!, amount);
      coins.set(p.userId!, (coins.get(p.userId!) ?? 0) + amount);
    }

    // Rank, as recordGameRating does it: multiplayer with 2+ signed-in humans.
    if (game.mode === "MULTIPLAYER" && humans.length >= 2) {
      const ranked = rankPlayers(state, []);
      const players = humans.map((p) => ({
        ...(ratings.get(p.userId!) ?? defaultRatingSnapshot),
        userId: p.userId!,
        place: ranked.find((r) => r.seat === p.seat)!.place,
      }));
      for (const { userId, ...next } of nextRatings(players)) {
        from.rating.push({ userId, before: players.find((p) => p.userId === userId)!.rating, after: next.rating });
        ratings.set(userId, next);
      }
    }

    // Collections, as saveCollectedCards does it.
    const recruited = cardsRecruited(moves);
    for (const p of humans) {
      const mine = collections.get(p.userId!) ?? new Map<string, number>();
      from.cardXpBefore.set(p.userId!, cardLevelXp([...mine.values()]));
      for (const [cardId, times] of recruited.get(p.seat) ?? []) {
        const before = mine.get(cardId) ?? 0;
        mine.set(cardId, before + times);
        from.cards.push({ userId: p.userId!, cardId, before, after: before + times });
      }
      collections.set(p.userId!, mine);
    }

    if (verbose) console.log(`\n${game.updatedAt.toISOString().slice(0, 16).replace("T", " ")}  ${game.mode}`);
    for (const p of humans) {
      const rewards = buildGameRewards(p.userId!, from)!;
      writes.push({ gameId: game.id, seat: p.seat, rewards });
      if (!verbose) continue;
      const rating = rewards.rating ? `rank ${rewards.rating.before} → ${rewards.rating.after}` : "unrated";
      const ups = rewards.cardLevelUps.map((c) => `${c.cardId} ${c.from} → ${c.to}`).join(", ");
      console.log(`  ${p.user!.username.padEnd(16)} ${rating.padEnd(22)} +${String(rewards.coins).padStart(2)} coins   xp ${rewards.xp.before} → ${rewards.xp.after}${ups ? `   ${ups}` : ""}`);
    }
  }
  if (verbose) console.log();

  console.log(`${games.length} finished games, ${writes.length} seats to save`);
  // The replay should land where the live game did; a difference means a game was rated or paid differently at the time.
  const [liveRatings, liveCoins] = await Promise.all([prisma.userRating.findMany(), prisma.coinTransaction.groupBy({ by: ["userId"], _sum: { delta: true } })]);
  for (const [userId, { rating }] of ratings) {
    const live = liveRatings.find((r) => r.userId === userId)?.rating;
    if (live !== rating) console.log(`  rank differs for ${userId}: replay ${rating}, database ${live ?? "none"}`);
  }
  for (const { userId, _sum } of liveCoins) {
    if ((coins.get(userId) ?? 0) !== (_sum.delta ?? 0)) console.log(`  coins differ for ${userId}: replay ${coins.get(userId) ?? 0}, database ${_sum.delta}`);
  }

  if (!process.argv.includes("--yes")) {
    console.log("\nNothing was changed. Run again with --yes to save the above.");
    return;
  }

  await prisma.$transaction(
    writes.map((w) =>
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
