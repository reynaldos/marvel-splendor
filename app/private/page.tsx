import { TopBar } from "@/components/TopBar";
import { redirect } from "next/navigation";

import { PrivateGameScreen } from "@/components/lobby/PrivateGameScreen";
import { auth0 } from "@/lib/auth0";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { openLobbyFor } from "@/lib/lobby";
import { pageMetadata } from "@/lib/site";

import { createGameAction, joinGameAction } from "./actions";

export const metadata = pageMetadata("Private Game", "Open a room for friends or join one with a code.", true);

export default async function PrivateGamePage() {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/private");
  // Already waiting in a room: straight back to it, not a new one.
  const user = await getOrCreateUser(session.user);
  const lobbyId = await openLobbyFor(user.id);
  if (lobbyId) redirect(`/lobby/${lobbyId}`);

  return (
    <>
      <TopBar />
      <PrivateGameScreen onCreate={createGameAction} onJoin={joinGameAction} />
    </>
  );
}
