// Sets every player's coins from the games already played to the end.
// Everyone starts at zero, then each finished game pays out in the order it
// ended, by the same rules as a live game: the toughest opponent at the table
// sets the rate, a player must have taken 4 turns, and bot games are capped
// per day. The ledger's game awards are replaced by what the games say, so it
// can be run again at any time.
//
//   pnpm coins:backfill            show what would be saved (changes nothing)
//   pnpm coins:backfill --verbose  also show every payout in order, with the running balance
//   pnpm coins:backfill --yes      save it
//
// Runs against DATABASE_URL from .env.
import "dotenv/config";

import { BOT_COINS_DAILY_CAP, coinsForOutcome, isTurnPrimary, opponentTierFor } from "@/lib/coins";
import { prisma } from "@/lib/db";
import type { GameSettings, GameState } from "@/lib/engine/types";

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
      moves: { select: { seat: true, payload: true } },
    },
  });

  const verbose = process.argv.includes("--verbose");
  console.log(`Database: ${new URL(process.env.DATABASE_URL!).hostname}`);

  const balances = new Map<string, number>();
  const usernames = new Map<string, string>();
  // Bot coins per player per UTC day, for the daily cap.
  const botCoinsByDay = new Map<string, number>();
  const awards: Array<{ userId: string; delta: number; reason: string; gameId: string; createdAt: Date }> = [];
  for (const game of games) {
    const state = game.state as unknown as GameState;
    const humans = game.players.filter((p) => !p.isBot && p.userId);
    if (verbose && humans.length > 0) {
      console.log(`\n${game.updatedAt.toISOString().slice(0, 16).replace("T", " ")}  ${game.mode}`);
    }
    for (const p of humans) {
      const userId = p.userId!;
      usernames.set(userId, p.user!.username);
      const tier = opponentTierFor(state.settings as GameSettings, p.seat, game.players);
      const isWinner = state.winnerSeat === p.seat || (state.sharedWinners?.includes(p.seat) ?? false);
      const turns = game.moves.filter(
        (m) => m.seat === p.seat && isTurnPrimary((m.payload as { type?: string })?.type),
      ).length;
      const earned = coinsForOutcome(tier, isWinner, turns);

      let amount = earned;
      if (tier !== "human" && amount > 0) {
        const day = `${userId}:${game.updatedAt.toISOString().slice(0, 10)}`;
        const today = botCoinsByDay.get(day) ?? 0;
        amount = Math.max(0, Math.min(amount, BOT_COINS_DAILY_CAP - today));
        botCoinsByDay.set(day, today + amount);
      }
      if (amount > 0) {
        awards.push({ userId, delta: amount, reason: `game:${tier}:${isWinner ? "win" : "loss"}`, gameId: game.id, createdAt: game.updatedAt });
        balances.set(userId, (balances.get(userId) ?? 0) + amount);
      }

      if (!verbose) continue;
      const why = turns < 4 ? "under 4 turns" : amount < earned ? `daily cap, ${earned} earned` : `${tier} ${isWinner ? "win" : "loss"}`;
      console.log(`  ${p.user!.username.padEnd(16)} +${String(amount).padStart(3)}  → ${String(balances.get(userId) ?? 0).padStart(5)}  (${why}, ${turns} turns)`);
    }
  }
  if (verbose) console.log();

  console.log(`${games.length} finished games, ${awards.length} payouts, ${balances.size} players with coins`);
  for (const [userId, balance] of [...balances].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${usernames.get(userId)}  ${balance}`);
  }

  if (!process.argv.includes("--yes")) {
    console.log("\nNothing was changed. Run again with --yes to save the above.");
    return;
  }

  // Game awards are rebuilt from scratch; anything else in the ledger (a shop spend, later) is kept and counted.
  await prisma.$transaction(async (tx) => {
    await tx.coinTransaction.deleteMany({ where: { reason: { startsWith: "game:" } } });
    await tx.coinTransaction.createMany({ data: awards });
    const totals = await tx.coinTransaction.groupBy({ by: ["userId"], _sum: { delta: true } });
    await tx.userCoins.deleteMany({ where: { userId: { notIn: totals.map((t) => t.userId) } } });
    for (const { userId, _sum } of totals) {
      const balance = _sum.delta ?? 0;
      await tx.userCoins.upsert({ where: { userId }, create: { userId, balance }, update: { balance } });
    }
  });
  console.log(`\nSaved. The ledger now holds ${await prisma.coinTransaction.count()} awards.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
