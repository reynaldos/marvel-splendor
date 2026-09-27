import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { redirect } from "next/navigation";

import { Input } from "@/components/ui/input";
import { SettingsForm } from "@/components/lobby/SettingsForm";
import { auth0 } from "@/lib/auth0";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { createLobby } from "@/lib/lobby";

async function createGameAction() {
  "use server";
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/");
  const user = await getOrCreateUser(session.user);
  const gameId = await createLobby(user.id);
  redirect(`/lobby/${gameId}`);
}

// The join page does the joining (and the sign-in check), so the share link
// and this form are one code path.
async function joinGameAction(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "").trim();
  redirect(`/join/${encodeURIComponent(code)}`);
}

// Landing page (ARCHITECTURE.md §6): Play vs Computer / Create / Join.
export default async function Home() {
  const session = await auth0.getSession();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col items-center gap-2 text-center">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Splendor · Marvel Edition
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Marvel Splendor</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Recruit Marvel&apos;s mightiest heroes, race for the Infinity Stones, and assemble the
          Avengers before your opponent does.
        </p>
        {session ? (
          <p className="text-xs text-muted-foreground">
            Signed in as{" "}
            <span className="font-medium text-foreground">
              {session.user.name ?? session.user.email}
            </span>{" "}
            · <a href="/auth/logout" className="underline">Sign out</a>
          </p>
        ) : null}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Play vs Computer</CardTitle>
          <CardDescription>
            Configure the table and start immediately — no lobby, no waiting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {session ? (
            <SettingsForm />
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">
                Sign in to start a game against the computer.
              </p>
              <Button asChild>
                <a href="/auth/login?returnTo=/">Sign in to play</a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create</CardTitle>
            <CardDescription>Host a private game friends join with a share code.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createGameAction}>
              <Button type="submit" className="w-full">
                {session ? "Create game" : "Sign in to create"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Join</CardTitle>
            <CardDescription>Enter a friend&apos;s share code to join their table.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={joinGameAction} className="flex gap-2">
              <Input
                name="code"
                aria-label="Join code"
                placeholder="ABC234"
                required
                maxLength={6}
                autoComplete="off"
                autoCapitalize="characters"
                className="font-mono uppercase"
              />
              <Button type="submit">Join</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
