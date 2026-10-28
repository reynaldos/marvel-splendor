import Link from "next/link";
import { redirect } from "next/navigation";

import { NOTICE_BUTTON, NoticeScreen } from "@/components/lobby/NoticeScreen";
import { TopBar } from "@/components/TopBar";

import { DuelGameScreen } from "@/components/lobby/DuelGameScreen";
import { auth0 } from "@/lib/auth0";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { OPEN_GAMES_REASON, openGamesOf, openLobbyFor } from "@/lib/lobby";
import { MAX_OPEN_GAMES } from "@/lib/lobby-rules";
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
      <DuelGameScreen onCreate={createDuelRoomAction} onJoin={joinGameAction} />
    </>
  );
}
