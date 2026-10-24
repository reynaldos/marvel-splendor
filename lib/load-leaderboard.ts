import { revalidateTag, unstable_cache } from "next/cache";
import { after } from "next/server";

import type { LeaderboardEntry } from "@/components/profile/LeaderboardScreen";
import { prisma } from "@/lib/db";
import { accountXpByUser } from "@/lib/load-xp";
import { publicAvatarUrl } from "@/lib/r2";
import { placeBy } from "@/lib/rating";
import { accountFrameTier, accountLevel } from "@/lib/xp";

// ponytail: top 100 only, no paging. Add a "find me" row once the list outgrows it.
const TOP = 100;
const TAG = "leaderboard";

const USER_SELECT = { id: true, username: true, avatarKey: true } as const;

/** Usernames kept off both lists, from LEADERBOARD_HIDDEN: the dev's own accounts. */
const HIDDEN = (process.env.LEADERBOARD_HIDDEN ?? "").split(",").map((name) => name.trim()).filter(Boolean);

/** Both boards, best first and placed, read from the database. Exported for its test; pages read `loadLeaderboard`. */
export async function buildLeaderboard() {
  const [rated, accountXp] = await Promise.all([
    prisma.userRating.findMany({
      where: { user: { username: { notIn: HIDDEN } } },
      orderBy: [{ rating: "desc" }, { gamesRated: "desc" }, { updatedAt: "asc" }],
      take: TOP,
      include: { user: { select: USER_SELECT } },
    }),
    accountXpByUser(),
  ]);
  const topXpIds = [...accountXp].sort((a, b) => b[1] - a[1]).slice(0, TOP).map(([id]) => id);
  const xpUsers = await prisma.user.findMany({
    where: { id: { in: topXpIds }, username: { notIn: HIDDEN } },
    select: USER_SELECT,
  });

  const xpOf = (id: string) => accountXp.get(id) ?? 0;
  const entry = (user: (typeof xpUsers)[number]): Omit<LeaderboardEntry, "place"> => {
    const xp = xpOf(user.id);
    const level = accountLevel(xp);
    return {
      username: user.username,
      level,
      xp,
      avatarUrl: publicAvatarUrl(user.avatarKey),
      avatarTier: accountFrameTier(level),
    };
  };

  return {
    ranked: placeBy(
      rated.map(({ user, rating, gamesRated }) => ({ ...entry(user), rating, gamesRated })),
      (row) => row.rating,
    ),
    byXp: placeBy(
      xpUsers.sort((a, b) => xpOf(b.id) - xpOf(a.id)).map(entry),
      (row) => row.xp,
    ),
  };
}

/** Both boards, kept from one game's end to the next; an hour at most, for a changed name or picture. */
export const loadLeaderboard = unstable_cache(buildLeaderboard, [TAG, ...HIDDEN], { tags: [TAG], revalidate: 60 * 60 });

/** Rebuilds the boards once the response is out, so the next look at them is quick and current. */
export function refreshLeaderboard() {
  revalidateTag(TAG, { expire: 0 });
  after(() => loadLeaderboard().catch((error) => console.error("leaderboard not refreshed", error)));
}
