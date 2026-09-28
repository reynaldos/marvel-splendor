import type { Viewport } from "next";
import { redirect } from "next/navigation";

import { PrivateGameScreen } from "@/components/lobby/PrivateGameScreen";
import { auth0 } from "@/lib/auth0";
import { pageMetadata } from "@/lib/site";

import { createGameAction, joinGameAction } from "./actions";

// Draw under the phone's notch margins; the stage pads the content back out.
export const viewport: Viewport = { viewportFit: "cover" };

export const metadata = pageMetadata("Private Game", "Open a room for friends or join one with a code.", true);

export default async function PrivateGamePage() {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/private");

  return <PrivateGameScreen onCreate={createGameAction} onJoin={joinGameAction} />;
}
