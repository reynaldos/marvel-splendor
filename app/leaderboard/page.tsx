import { LeaderboardScreen } from "@/components/profile/LeaderboardScreen";
import { TopBar } from "@/components/TopBar";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { publicAvatarUrl } from "@/lib/r2";
import { placeByRating } from "@/lib/rating";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("Leaderboard", "The top-ranked Marvel Splendor players.");

export default async function LeaderboardPage() {
  const [session, rated] = await Promise.all([
    auth0.getSession(),
    prisma.userRating.findMany({
      orderBy: [{ rating: "desc" }, { gamesRated: "desc" }, { updatedAt: "asc" }],
      // ponytail: top 100 only, no paging. Add a "find me" row once the list outgrows it.
      take: 100,
      include: { user: { select: { username: true, name: true, avatarKey: true, auth0Sub: true } } },
    }),
  ]);

  const rows = placeByRating(
    rated.map(({ user, rating, gamesRated }) => ({
      username: user.username,
      name: user.name,
      avatarUrl: publicAvatarUrl(user.avatarKey),
      rating,
      gamesRated,
    })),
  );
  const own = rated.find((r) => r.user.auth0Sub === session?.user.sub)?.user.username ?? null;

  return (
    <>
      <TopBar />
      <LeaderboardScreen rows={rows} own={own} />
    </>
  );
}
