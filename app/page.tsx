import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SettingsForm } from "@/components/lobby/SettingsForm";
import { auth0 } from "@/lib/auth0";

// Landing page (ARCHITECTURE.md §6): Play vs Computer / Create / Join.
// Phase 1 only implements vs-computer end to end; Create (multiplayer
// lobby) and Join (by code) are Phase 2 — kept visible but disabled per the
// approved landing description.
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
            · <Link href="/auth/logout" className="underline">Sign out</Link>
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
                <Link href="/auth/login?returnTo=/">Sign in to play</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="opacity-70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Create
              <Badge variant="outline">Coming soon</Badge>
            </CardTitle>
            <CardDescription>Host a private game friends join with a share code.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled className="w-full">
              Create game
            </Button>
          </CardContent>
        </Card>

        <Card className="opacity-70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Join
              <Badge variant="outline">Coming soon</Badge>
            </CardTitle>
            <CardDescription>Enter a friend&apos;s share code to join their table.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled className="w-full">
              Join game
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
