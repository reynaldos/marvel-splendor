// Joins up visits that were split by a change of IP address mid-sitting.
// Each user's visits are walked earliest first, and one that starts inside
// the 30 minute gap after the one before is folded into it: the earlier
// visit keeps its address and runs to the later end, the later row goes.
//
//   pnpm visits:backfill        show what would be merged (changes nothing)
//   pnpm visits:backfill --yes  save it
//
// Runs against DATABASE_URL from .env.
import "dotenv/config";

import { prisma } from "@/lib/db";
import { mergeVisits } from "@/lib/record-visit";

async function main() {
  console.log(`Database: ${new URL(process.env.DATABASE_URL!).hostname}`);
  const users = await prisma.user.findMany({
    select: { username: true, visits: { orderBy: { startedAt: "asc" } } },
  });

  const updates: Array<{ id: string; lastSeenAt: Date }> = [];
  const gone: string[] = [];
  for (const user of users) {
    const { kept, dropped } = mergeVisits(user.visits);
    if (dropped.length === 0) continue;
    console.log(`${user.username}: ${user.visits.length} visits -> ${kept.length}`);
    gone.push(...dropped.map((v) => v.id));
    updates.push(...kept);
  }
  console.log(`\n${gone.length} visits to fold away.`);

  if (!process.argv.includes("--yes")) {
    console.log("Dry run. Pass --yes to save.");
    return;
  }
  await prisma.$transaction([
    ...updates.map((u) => prisma.userVisit.update({ where: { id: u.id }, data: { lastSeenAt: u.lastSeenAt } })),
    prisma.userVisit.deleteMany({ where: { id: { in: gone } } }),
  ]);
  console.log("Saved.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
