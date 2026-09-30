import { TopBar } from "@/components/TopBar";
import { notFound } from "next/navigation";

import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { cardLevelXpByUser } from "@/lib/load-card-xp";
import { loadGameHistory } from "@/lib/load-game-history";
import { defaultUserStatsSnapshot } from "@/lib/record-stats";
import { publicAvatarUrl } from "@/lib/r2";
import { pageMetadata } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return pageMetadata(`${username}'s profile`, `${username}'s Marvel Splendor wins and stats.`);
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const user = await prisma.user.findUnique({ where: { username }, include: { stats: true, rating: true } });
  if (!user) notFound();

  const [session, history, cardXp] = await Promise.all([auth0.getSession(), loadGameHistory(user.id), cardLevelXpByUser([user.id])]);

  return (
    <>
      <TopBar />
      <ProfileScreen
        username={user.username}
        name={user.name}
        avatarUrl={publicAvatarUrl(user.avatarKey)}
        rating={user.rating?.rating ?? null}
        xpAvatarStyle={user.xpAvatarStyle}
        xpCardStyle={user.xpCardStyle}
        stats={user.stats ?? defaultUserStatsSnapshot}
        cardXp={cardXp.get(user.id) ?? 0}
        career={history.career}
        records={history.records}
        games={history.games}
        isOwn={session?.user.sub === user.auth0Sub}
      />
    </>
  );
}
