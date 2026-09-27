import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { auth0 } from "@/lib/auth0";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { joinLobby } from "@/lib/lobby";

// Join flow (ARCHITECTURE.md §6): the share link and the landing page's
// Join form both land here. Opening it seats you; if you're already seated
// it just takes you back to your game.
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const session = await auth0.getSession();
  if (!session) {
    redirect(`/auth/login?returnTo=${encodeURIComponent(`/join/${code}`)}`);
  }
  const user = await getOrCreateUser(session.user);

  const result = await joinLobby(user.id, decodeURIComponent(code));
  if (result.ok) {
    redirect(result.status === "LOBBY" ? `/lobby/${result.gameId}` : `/play/${result.gameId}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <h1 className="text-2xl font-bold">Couldn&apos;t join</h1>
      <p className="text-sm text-muted-foreground">{result.reason}</p>
      <Button asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
