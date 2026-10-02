// Gives every player the daily bonus for each day they showed up, from the day they joined
// through yesterday, as the streak the game would have kept: a day with a visit is a claim,
// consecutive days climb and wrap at Day 8, and a day away starts over at Day 1. Every
// daily row is replaced, today's included, so everyone collects today afresh at the right
// day. Everything else in the ledger is kept, and balances are set to the ledger's totals.
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
  const [users, visits] = await Promise.all([
    prisma.user.findMany({ select: { id: true, username: true, createdAt: true }, orderBy: { createdAt: "asc" } }),
    prisma.userVisit.findMany({ select: { userId: true, startedAt: true, lastSeenAt: true } }),
  ]);

  // The UTC days each player was seen on: every day a visit touched, and the day they joined.
  const seen = new Map<string, Set<number>>();
  const mark = (userId: string, from: number, to: number) => {
    const days = seen.get(userId) ?? new Set<number>();
    for (let day = from; day <= to; day += DAY_MS) days.add(day);
    seen.set(userId, days);
  };
  for (const v of visits) mark(v.userId, startOfUtcDay(v.startedAt), startOfUtcDay(v.lastSeenAt));
  for (const u of users) mark(u.id, startOfUtcDay(u.createdAt), startOfUtcDay(u.createdAt));

  const rows: Array<{ userId: string; delta: number; reason: string; createdAt: Date }> = [];
  for (const user of users) {
    let streak = 0;
    let lastClaim = Number.NEGATIVE_INFINITY;
    let coins = 0;
    for (let day = startOfUtcDay(user.createdAt); day < today; day += DAY_MS) {
      if (!seen.get(user.id)?.has(day)) continue;
      streak = day === lastClaim + DAY_MS ? (streak % DAILY_BONUS.length) + 1 : 1;
      lastClaim = day;
      const amount = DAILY_BONUS[streak - 1];
      coins += amount;
      rows.push({ userId: user.id, delta: amount, reason: `${DAILY_BONUS_REASON}${streak}`, createdAt: new Date(day + DAY_MS / 2) });
    }
    const claims = rows.filter((r) => r.userId === user.id).length;
    // Today continues the streak only if yesterday was claimed.
    const next = lastClaim === today - DAY_MS ? (streak % DAILY_BONUS.length) + 1 : 1;
    console.log(
      `  ${user.username.padEnd(16)} joined ${user.createdAt.toISOString().slice(0, 10)}  ${String(claims).padStart(3)} days seen  +${String(coins).padStart(4)} coins  last at Day ${streak}, collects Day ${next} today`,
    );
  }
  console.log(`\n${users.length} players, ${rows.length} daily claims, ${rows.reduce((n, r) => n + r.delta, 0)} coins`);

  if (!process.argv.includes("--yes")) {
    console.log("\nNothing was changed. Run again with --yes to save the above.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.coinTransaction.deleteMany({ where: { reason: { startsWith: DAILY_BONUS_REASON } } });
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
