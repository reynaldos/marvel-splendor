import { TopBar } from "@/components/TopBar";
import { notFound, redirect } from "next/navigation";

import { SettingsScreen } from "@/components/profile/SettingsScreen";
import { auth0 } from "@/lib/auth0";
import { editTarget } from "@/lib/edit-target";
import { accountXpByUser } from "@/lib/load-xp";
import { publicAvatarUrl } from "@/lib/r2";
import { pageMetadata } from "@/lib/site";
import { accountTierFor } from "@/lib/xp";

import { checkUsernameAction, saveProfileAction } from "./actions";

export const metadata = pageMetadata("Profile settings", "Your picture, name and username.", true);

/** Own settings, or with `?user=<username>` another player's for an admin. */
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ user?: string }> }) {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/settings");

  const { user: forUser } = await searchParams;
  const user = await editTarget(session.user, forUser);
  if (!user) notFound();
  const xp = await accountXpByUser([user.id]);

  return (
    <>
      <TopBar />
      <SettingsScreen
        username={user.username}
        name={user.name}
        avatarUrl={publicAvatarUrl(user.avatarKey)}
        avatarTier={accountTierFor(xp.get(user.id) ?? 0)}
        xpAvatarStyle={user.xpAvatarStyle}
        xpCardStyle={user.xpCardStyle}
        hideFromLeaderboard={user.hideFromLeaderboard}
        forUser={forUser ?? null}
        onCheckUsername={checkUsernameAction}
        onSave={saveProfileAction}
      />
    </>
  );
}
