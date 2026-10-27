import { AddToHomeScreen } from "@/components/AddToHomeScreen";
import { HomeScreen, WelcomeScreen } from "@/components/home/HomeScreen";
import { TopBar } from "@/components/TopBar";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { openGameFor, openLobbyFor } from "@/lib/lobby";

export default async function Home() {
  const session = await auth0.getSession();
  if (!session) return <WelcomeScreen />;
  // A room they were invited to while away from the app is one tap off the home screen.
  const user = await getOrCreateUser(session.user);
  const lobbyId = await openLobbyFor(user.id);
  // So is a game against bots they paused or walked away from.
  const gameId = await openGameFor(user.id);
  // Someone who has never finished a Duel gets a nudge toward its how-to.
  const duelsPlayed = await prisma.game.count({
    where: { status: "FINISHED", players: { some: { userId: user.id } }, settings: { path: ["rules"], equals: "duel" } },
  });

  return (
    <>
      <TopBar />
      <HomeScreen lobbyId={lobbyId} gameId={gameId} duelPlayed={duelsPlayed > 0} />
      <AddToHomeScreen />
    </>
  );
}
