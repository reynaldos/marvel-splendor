import Link from "next/link";
import { redirect } from "next/navigation";

import { NOTICE_BUTTON, NoticeScreen } from "@/components/lobby/NoticeScreen";
import { TopBar } from "@/components/TopBar";

import { PrivateGameScreen } from "@/components/lobby/PrivateGameScreen";
import { auth0 } from "@/lib/auth0";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { OPEN_GAMES_REASON, openGamesOf, openLobbyFor } from "@/lib/lobby";
import { MAX_OPEN_GAMES } from "@/lib/lobby-rules";
import { pageMetadata } from "@/lib/site";

import { createGameAction, joinGameAction } from "./actions";

export const metadata = pageMetadata("Play Game", "Open a room: add bots, or share the code with friends. Or join a room by code.", true);

export default async function PrivateGamePage() {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/private");
  // Already waiting in a room: straight back to it, not a new one.
  const user = await getOrCreateUser(session.user);
  const lobbyId = await openLobbyFor(user.id);
  if (lobbyId) redirect(`/lobby/${lobbyId}`);
  // At the cap: the notice, not a room.
  if ((await openGamesOf(user.id)) >= MAX_OPEN_GAMES) {
    return (
      <NoticeScreen title={`${MAX_OPEN_GAMES} games open`} message={OPEN_GAMES_REASON}>
        <Link href="/" className={NOTICE_BUTTON}>
          Back to home
        </Link>
      </NoticeScreen>
    );
  }

  return (
    <>
      <TopBar />
      <PrivateGameScreen onCreate={createGameAction} onJoin={joinGameAction} />
    </>
  );
}
