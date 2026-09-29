import { TopBar } from "@/components/TopBar";
import { redirect } from "next/navigation";

import { SoloGameScreen } from "@/components/lobby/SoloGameScreen";
import { auth0 } from "@/lib/auth0";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("VS Computer", "Set up a game against the computer.", true);

export default async function SoloGamePage() {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/solo");

  return (
    <>
      <TopBar />
      <SoloGameScreen />
    </>
  );
}
