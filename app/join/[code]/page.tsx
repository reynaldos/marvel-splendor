import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { NOTICE_BUTTON, NoticeScreen } from "@/components/lobby/NoticeScreen";
import { auth0 } from "@/lib/auth0";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { joinLobby, normalizeJoinCode } from "@/lib/lobby";
import { pageMetadata } from "@/lib/site";

type Props = { params: Promise<{ code: string }> };

// This is the link friends are sent, so its preview is the invite.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = normalizeJoinCode(decodeURIComponent((await params).code));
  return pageMetadata(
    "You're invited to a game",
    code ? `Join my Marvel Splendor game with room code ${code}.` : undefined,
    true,
  );
}

// Opening the link seats you; if you're already seated it takes you back to your game.
export default async function JoinPage({ params }: Props) {
  const { code } = await params;

  const session = await auth0.getSession();
  if (!session) {
    // Shown, not redirected, so the link's preview is this page and not the sign-in form.
    return (
      <NoticeScreen title="You're invited" message="Sign in to take your seat at the table.">
        <a href={`/auth/login?returnTo=${encodeURIComponent(`/join/${code}`)}`} className={NOTICE_BUTTON}>
          Sign in to join
        </a>
      </NoticeScreen>
    );
  }
  const user = await getOrCreateUser(session.user);

  const result = await joinLobby(user.id, decodeURIComponent(code));
  if (result.ok) {
    redirect(result.status === "LOBBY" ? `/lobby/${result.gameId}` : `/play/${result.gameId}`);
  }

  return (
    <NoticeScreen title="Couldn't join" message={result.reason}>
      <Link href="/" className={NOTICE_BUTTON}>
        Back to home
      </Link>
    </NoticeScreen>
  );
}
