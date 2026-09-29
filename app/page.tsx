import { HomeScreen, WelcomeScreen } from "@/components/home/HomeScreen";
import { TopBar } from "@/components/TopBar";
import { auth0 } from "@/lib/auth0";

export default async function Home() {
  const session = await auth0.getSession();
  if (!session) return <WelcomeScreen />;

  return (
    <>
      <TopBar />
      <HomeScreen />
    </>
  );
}
