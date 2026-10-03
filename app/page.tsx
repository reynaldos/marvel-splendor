import { AddToHomeScreen } from "@/components/AddToHomeScreen";
import { HomeScreen, WelcomeScreen } from "@/components/home/HomeScreen";
import { TopBar } from "@/components/TopBar";
import { auth0 } from "@/lib/auth0";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { openLobbyFor } from "@/lib/lobby";

export default async function Home() {
  const session = await auth0.getSession();
  if (!session) return <WelcomeScreen />;
  // A room they were invited to while away from the app is one tap off the home screen.
  const user = await getOrCreateUser(session.user);
  const lobbyId = await openLobbyFor(user.id);

  return (
    <>
      <TopBar />
      <HomeScreen lobbyId={lobbyId} />
      <AddToHomeScreen />
    </>
  );
}
