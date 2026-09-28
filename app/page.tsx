
import { HomeScreen, WelcomeScreen } from "@/components/home/HomeScreen";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { publicAvatarUrl } from "@/lib/r2";

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
    />
  );
}
