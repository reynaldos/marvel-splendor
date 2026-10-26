import { TopBar } from "@/components/TopBar";
import { redirect } from "next/navigation";

import { DuelGameScreen } from "@/components/lobby/DuelGameScreen";
import { auth0 } from "@/lib/auth0";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { openLobbyFor } from "@/lib/lobby";
import { pageMetadata } from "@/lib/site";

import { joinGameAction } from "../private/actions";
import { createDuelRoomAction } from "./actions";

export const metadata = pageMetadata("Duel", "Open a room for two: add a bot there, or a friend joins with a code.", true);

export default async function DuelPage() {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/duel");
  // Already waiting in a room: straight back to it.
  const user = await getOrCreateUser(session.user);
  const lobbyId = await openLobbyFor(user.id);
  if (lobbyId) redirect(`/lobby/${lobbyId}`);

  return (
    <>
      <TopBar />
      <DuelGameScreen onCreate={createDuelRoomAction} onJoin={joinGameAction} />
    </>
  );
}
