import type { Viewport } from "next";
import { redirect } from "next/navigation";

import { PrivateGameScreen } from "@/components/lobby/PrivateGameScreen";
import { auth0 } from "@/lib/auth0";

import { createGameAction, joinGameAction } from "./actions";

// Draw under the phone's notch margins; the stage pads the content back out.
export const viewport: Viewport = { viewportFit: "cover" };

export default async function PrivateGamePage() {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/private");

  return <PrivateGameScreen onCreate={createGameAction} onJoin={joinGameAction} />;
}
