import { TopBarView } from "@/components/TopBarView";
import { claimDailyBonusAction } from "@/app/daily-bonus/actions";
import { deleteAccountAction } from "@/app/settings/actions";
import { isAdmin } from "@/lib/admin";
import { auth0 } from "@/lib/auth0";
import { dailyBonusState } from "@/lib/daily-bonus";
import { lastDailyClaim } from "@/lib/record-daily-bonus";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { accountXpByUser } from "@/lib/load-xp";
import { publicAvatarUrl } from "@/lib/r2";
import { accountTierFor, progressForScore } from "@/lib/xp";

/**
 * The bar along the top of every menu screen: who is signed in, their wins and coins,
 * the game's name, and the menu. Nothing for a visitor who isn't signed in.
 * Put it beside a screen laid out with `StageRows`, which leaves room for it.
 */
export async function TopBar() {
  const session = await auth0.getSession();
  if (!session) return null;

  const user = await getOrCreateUser(session.user);
  const admin = isAdmin(session.user);
  const [stats, coins, rating, accountXp, newFeedback, dailyClaim] = await Promise.all([
    prisma.userStats.findUnique({ where: { userId: user.id } }),
    prisma.userCoins.findUnique({ where: { userId: user.id }, select: { balance: true } }),
    prisma.userRating.findUnique({ where: { userId: user.id }, select: { rating: true } }),
    accountXpByUser([user.id]),
    // Only admins see the feedback badge, so only they pay for the count.
    admin ? prisma.feedback.count({ where: { status: "NEW" } }) : 0,
    lastDailyClaim(user.id),
  ]);

  const xp = accountXp.get(user.id) ?? 0;

  return (
    <TopBarView
      username={user.username}
      avatarUrl={publicAvatarUrl(user.avatarKey)}
      tier={accountTierFor(xp)}
      framed={user.xpAvatarStyle}
      progress={progressForScore(xp)}
      rating={rating?.rating ?? null}
      wins={stats?.wins ?? 0}
      coins={coins?.balance ?? 0}
      isAdmin={admin}
      newFeedback={newFeedback > 0}
      dailyBonus={dailyBonusState(dailyClaim)}
      onClaimDailyBonus={claimDailyBonusAction}
      onDeleteAccount={deleteAccountAction}
    />
  );
}
