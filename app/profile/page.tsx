import { redirect } from "next/navigation";

import { auth0 } from "@/lib/auth0";
import { getOrCreateUser } from "@/lib/get-or-create-user";

// Convenience redirect: signed-in users hitting the bare `/profile` land on
// their own `profile/[username]` page. Not listed explicitly in
// ARCHITECTURE.md's route table, but avoids needing to know your own
// username to find "my profile".
export default async function ProfileIndexPage() {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/profile");

  const user = await getOrCreateUser(session.user);
  redirect(`/profile/${user.username}`);
}
