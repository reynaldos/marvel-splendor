import { TopBar } from "@/components/TopBar";
import { notFound } from "next/navigation";

import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { isAdmin } from "@/lib/admin";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { standingWith } from "@/lib/friends";
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
  const friend = session && !isOwn ? await friendStanding(session.user.sub, user) : null;

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
        friend={friend}
      />
    </>
  );
}

/** The friend button's state for a signed-in viewer on someone else's page; null when no button should show. */
async function friendStanding(viewerSub: string, other: { id: string; blockedAt: Date | null }) {
  const viewer = await prisma.user.findUnique({ where: { auth0Sub: viewerSub }, select: { id: true } });
  if (!viewer) return null;
  const { standing, requestId } = await standingWith(viewer.id, other);
  return standing === "hidden" ? null : { standing, requestId, userId: other.id };
}
