import type { Viewport } from "next";
import { redirect } from "next/navigation";

import { HomeScreen, WelcomeScreen } from "@/components/home/HomeScreen";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { createLobby } from "@/lib/lobby";
import { publicAvatarUrl } from "@/lib/r2";

// Draw under the phone's notch margins; the stage pads the content back out.
export const viewport: Viewport = { viewportFit: "cover" };

async function createGameAction() {
  "use server";
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/");
  const user = await getOrCreateUser(session.user);
  const gameId = await createLobby(user.id);
  redirect(`/lobby/${gameId}`);
}

// The join page does the joining and the sign-in check.
async function joinGameAction(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "").trim();
  redirect(`/join/${encodeURIComponent(code)}`);
}

export default async function Home() {
  const session = await auth0.getSession();
  if (!session) return <WelcomeScreen />;

  const user = await getOrCreateUser(session.user);
  const stats = await prisma.userStats.findUnique({ where: { userId: user.id } });

  return (
    <HomeScreen
      username={user.username}
      avatarUrl={publicAvatarUrl(user.avatarKey)}
      wins={stats?.wins ?? 0}
      gamesPlayed={stats?.gamesPlayed ?? 0}
      onCreate={createGameAction}
      onJoin={joinGameAction}
    />
  );
}
