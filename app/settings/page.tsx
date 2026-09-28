import { redirect } from "next/navigation";

import { SettingsScreen } from "@/components/profile/SettingsScreen";
import { auth0 } from "@/lib/auth0";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { publicAvatarUrl } from "@/lib/r2";
import { pageMetadata } from "@/lib/site";

import { checkUsernameAction, saveProfileAction } from "./actions";

export const metadata = pageMetadata("Profile settings", "Your picture, name and username.", true);

export default async function SettingsPage() {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/settings");

  const user = await getOrCreateUser(session.user);

  return (
    <SettingsScreen
      username={user.username}
      name={user.name}
      avatarUrl={publicAvatarUrl(user.avatarKey)}
      onCheckUsername={checkUsernameAction}
      onSave={saveProfileAction}
    />
  );
}
