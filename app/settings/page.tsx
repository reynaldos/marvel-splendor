import { TopBar } from "@/components/TopBar";
import { redirect } from "next/navigation";

import { SettingsScreen } from "@/components/profile/SettingsScreen";
import { auth0 } from "@/lib/auth0";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { accountXpByUser } from "@/lib/load-xp";
import { publicAvatarUrl } from "@/lib/r2";
import { pageMetadata } from "@/lib/site";
import { accountTierFor } from "@/lib/xp";

import { checkUsernameAction, saveProfileAction } from "./actions";

export const metadata = pageMetadata("Profile settings", "Your picture, name and username.", true);

export default async function SettingsPage() {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/settings");

  const user = await getOrCreateUser(session.user);
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
        onCheckUsername={checkUsernameAction}
        onSave={saveProfileAction}
      />
    </>
  );
}
