import { TopBarView } from "@/components/TopBarView";
import { isAdmin } from "@/lib/admin";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { publicAvatarUrl } from "@/lib/r2";
import { defaultUserStatsSnapshot } from "@/lib/record-stats";
import { accountProgress, accountTierFor } from "@/lib/xp";

/**
 * The bar along the top of every menu screen: who is signed in, their wins and coins,
 * the game's name, and the menu. Nothing for a visitor who isn't signed in.
 * Put it beside a screen laid out with `StageRows`, which leaves room for it.
 */
export async function TopBar() {
  const session = await auth0.getSession();
  if (!session) return null;

  const user = await getOrCreateUser(session.user);
  const [stats, coins, rating] = await Promise.all([
    prisma.userStats.findUnique({ where: { userId: user.id } }),
    prisma.userCoins.findUnique({ where: { userId: user.id }, select: { balance: true } }),
    prisma.userRating.findUnique({ where: { userId: user.id }, select: { rating: true } }),
  ]);

  const snapshot = stats ?? defaultUserStatsSnapshot;

  return (
    <TopBarView
      username={user.username}
      avatarUrl={publicAvatarUrl(user.avatarKey)}
      tier={accountTierFor(snapshot)}
      framed={user.xpAvatarStyle}
      progress={accountProgress(snapshot)}
      rating={rating?.rating ?? null}
      wins={stats?.wins ?? 0}
      coins={coins?.balance ?? 0}
      isAdmin={isAdmin(session.user)}
    />
  );
}
