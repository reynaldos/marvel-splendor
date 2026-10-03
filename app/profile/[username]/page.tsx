import { TopBar } from "@/components/TopBar";
import { notFound } from "next/navigation";

import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { isAdmin } from "@/lib/admin";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { accountXpByUser } from "@/lib/load-xp";
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

  const [session, history, xp] = await Promise.all([auth0.getSession(), loadGameHistory(user.id), accountXpByUser([user.id])]);
  const isOwn = session?.user.sub === user.auth0Sub;
  const admin = Boolean(session && isAdmin(session.user));

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
        xp={xp.get(user.id) ?? 0}
        career={history.career}
        records={history.records}
        // A player's games are theirs to see, and admins'; nobody else is sent them.
        games={isOwn || admin ? history.games : null}
        isOwn={isOwn}
        canEdit={isOwn || admin}
      />
    </>
  );
}
