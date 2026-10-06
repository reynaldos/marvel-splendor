import { LeaderboardScreen } from "@/components/profile/LeaderboardScreen";
import { TopBar } from "@/components/TopBar";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { loadLeaderboard } from "@/lib/load-leaderboard";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("Leaderboard", "The top-ranked Marvel Splendor players.");

export default async function LeaderboardPage() {
  const [session, boards] = await Promise.all([auth0.getSession(), loadLeaderboard()]);
  const own = session
    ? ((await prisma.user.findUnique({ where: { auth0Sub: session.user.sub }, select: { username: true } }))?.username ?? null)
    : null;

  return (
    <>
      <TopBar />
      <LeaderboardScreen {...boards} own={own} />
    </>
  );
}
