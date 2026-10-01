// Gives every player the daily bonus for each day since they joined, as an unbroken streak,
// up to and including yesterday. Today is left for them to collect themselves, and it carries
// the streak on. Daily rows dated before today are replaced; today's and everything else in the
// ledger are kept, and balances are set to the ledger's totals.
//
//   pnpm daily:backfill         show what would be paid (changes nothing)
//   pnpm daily:backfill --yes   save it
import "dotenv/config";

import { DAILY_BONUS, DAILY_BONUS_REASON } from "@/lib/daily-bonus";
import { prisma } from "@/lib/db";

const DAY_MS = 86_400_000;
const startOfUtcDay = (at: Date | number) => Math.floor(new Date(at).getTime() / DAY_MS) * DAY_MS;

async function main() {
  console.log(`Database: ${new URL(process.env.DATABASE_URL!).hostname}`);
  const today = startOfUtcDay(Date.now());
  const users = await prisma.user.findMany({ select: { id: true, username: true, createdAt: true }, orderBy: { createdAt: "asc" } });

  const rows: Array<{ userId: string; delta: number; reason: string; createdAt: Date }> = [];
  for (const user of users) {
    let streak = 0;
    let coins = 0;
    // Each day from the join day through yesterday, claimed at noon UTC.
    for (let day = startOfUtcDay(user.createdAt); day < today; day += DAY_MS) {
      const amount = DAILY_BONUS[streak % DAILY_BONUS.length];
      streak++;
      coins += amount;
      rows.push({ userId: user.id, delta: amount, reason: `${DAILY_BONUS_REASON}${((streak - 1) % DAILY_BONUS.length) + 1}`, createdAt: new Date(day + DAY_MS / 2) });
    }
    const reached = streak ? ((streak - 1) % DAILY_BONUS.length) + 1 : 0;
    console.log(
      `  ${user.username.padEnd(16)} joined ${user.createdAt.toISOString().slice(0, 10)}  ${String(streak).padStart(3)} days  +${String(coins).padStart(4)} coins  at Day ${reached}, collects Day ${(reached % DAILY_BONUS.length) + 1} today`,
    );
  }
  console.log(`\n${users.length} players, ${rows.length} daily claims, ${rows.reduce((n, r) => n + r.delta, 0)} coins`);

  if (!process.argv.includes("--yes")) {
    console.log("\nNothing was changed. Run again with --yes to save the above.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.coinTransaction.deleteMany({ where: { reason: { startsWith: DAILY_BONUS_REASON }, createdAt: { lt: new Date(today) } } });
    await tx.coinTransaction.createMany({ data: rows });
    const totals = await tx.coinTransaction.groupBy({ by: ["userId"], _sum: { delta: true } });
    for (const { userId, _sum } of totals) {
      const balance = _sum.delta ?? 0;
      await tx.userCoins.upsert({ where: { userId }, create: { userId, balance }, update: { balance } });
    }
  });
  console.log(`\nSaved. The ledger now holds ${await prisma.coinTransaction.count({ where: { reason: { startsWith: DAILY_BONUS_REASON } } })} daily claims.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
