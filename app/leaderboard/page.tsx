import { LeaderboardScreen, type LeaderboardEntry } from "@/components/profile/LeaderboardScreen";
import { TopBar } from "@/components/TopBar";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { accountXpByUser } from "@/lib/load-xp";
import { publicAvatarUrl } from "@/lib/r2";
import { placeBy } from "@/lib/rating";
import { pageMetadata } from "@/lib/site";
import { accountFrameTier, accountLevel } from "@/lib/xp";

export const metadata = pageMetadata("Leaderboard", "The top-ranked Marvel Splendor players.");

// ponytail: top 100 only, no paging. Add a "find me" row once the list outgrows it.
const TOP = 100;

const USER_SELECT = { id: true, username: true, avatarKey: true, auth0Sub: true, xpAvatarStyle: true } as const;

/** Usernames kept off both lists, from LEADERBOARD_HIDDEN: the dev's own accounts. */
const HIDDEN = (process.env.LEADERBOARD_HIDDEN ?? "").split(",").map((name) => name.trim()).filter(Boolean);

export default async function LeaderboardPage() {
  const [session, rated, accountXp] = await Promise.all([
    auth0.getSession(),
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
      avatarTier: user.xpAvatarStyle ? accountFrameTier(level) : undefined,
    };
  };

  const ranked = placeBy(
    rated.map(({ user, rating, gamesRated }) => ({ ...entry(user), rating, gamesRated })),
    (row) => row.rating,
  );
  const byXp = placeBy(
    xpUsers.sort((a, b) => xpOf(b.id) - xpOf(a.id)).map(entry),
    (row) => row.xp,
  );

  const sub = session?.user.sub;
  const own =
    rated.find((r) => r.user.auth0Sub === sub)?.user.username ??
    xpUsers.find((u) => u.auth0Sub === sub)?.username ??
    null;

  return (
    <>
      <TopBar />
      <LeaderboardScreen ranked={ranked} byXp={byXp} own={own} />
    </>
  );
}
