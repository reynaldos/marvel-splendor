import { notFound, redirect } from "next/navigation";

import { LobbyLive } from "@/components/lobby/LobbyLive";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { DEFAULT_SETTINGS, type GameSettings } from "@/lib/engine/types";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { MAX_SEATS } from "@/lib/lobby";

import {
  addBotAction,
  leaveAction,
  removeBotAction,
  startGameAction,
  updateSettingsAction,
} from "./actions";

const SELECT = "h-8 rounded-md border border-input bg-background px-2 text-sm";

// Pre-game lobby (ARCHITECTURE.md §6). Server-rendered; <LobbyLive> re-renders
// it whenever someone joins, leaves, or the host changes something.
export default async function LobbyPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;

  const session = await auth0.getSession();
  if (!session) {
    redirect(`/auth/login?returnTo=/lobby/${gameId}`);
  }
  const user = await getOrCreateUser(session.user);

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      players: { include: { user: { select: { username: true } } }, orderBy: { seat: "asc" } },
    },
  });
  // Also where guests land when the host closes the table.
  if (!game) notFound();

  const mySeat = game.players.find((p) => p.userId === user.id);
  // Not seated yet: the join page seats you, or explains why it can't.
  if (!mySeat) redirect(`/join/${game.joinCode}`);
  if (game.status !== "LOBBY") redirect(`/play/${game.id}`);

  const isHost = mySeat.seat === 0;
  const settings = { ...DEFAULT_SETTINGS, ...(game.settings as unknown as Partial<GameSettings>) };
  const shareUrl = `${process.env.APP_BASE_URL ?? ""}/join/${game.joinCode}`;
  const seats = Array.from({ length: MAX_SEATS }, (_, seat) => game.players.find((p) => p.seat === seat));
  const canStart = game.players.length >= 2;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-12">
      <LobbyLive gameId={game.id} />
      <Card>
        <CardHeader>
          <CardTitle>Game lobby</CardTitle>
          <CardDescription>Share this code with the friends you want at the table.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-1 rounded-lg bg-muted py-4">
            <span className="font-mono text-4xl font-bold tracking-[0.3em]">{game.joinCode}</span>
            <span className="text-xs break-all text-muted-foreground select-all">{shareUrl}</span>
          </div>

          <ol className="flex flex-col gap-2">
            {seats.map((player, seat) => (
              <li
                key={seat}
                className="flex min-h-11 items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                {player ? (
                  <>
                    <span className="font-medium">
                      {player.isBot ? "Bot" : (player.user?.username ?? "Player")}
                    </span>
                    <span className="flex items-center gap-1">
                      {seat === 0 ? <Badge variant="secondary">Host</Badge> : null}
                      {player.userId === user.id ? <Badge variant="outline">You</Badge> : null}
                      {player.isBot && isHost ? (
                        <form action={removeBotAction.bind(null, game.id, seat)}>
                          <Button type="submit" variant="ghost" size="sm">
                            Remove
                          </Button>
                        </form>
                      ) : null}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">Open seat</span>
                    {isHost ? (
                      <form action={addBotAction.bind(null, game.id)}>
                        <Button type="submit" variant="outline" size="sm">
                          Add bot
                        </Button>
                      </form>
                    ) : null}
                  </>
                )}
              </li>
            ))}
          </ol>

          {isHost ? (
            <form action={updateSettingsAction.bind(null, game.id)} className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Points to win
                <input
                  name="targetPoints"
                  type="number"
                  min={1}
                  max={99}
                  defaultValue={settings.targetPoints}
                  className={`${SELECT} w-20`}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Turn timer
                <select name="turnTimeSeconds" defaultValue={settings.turnTimeSeconds ?? 0} className={SELECT}>
                  <option value={0}>Untimed</option>
                  <option value={15}>15 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                  <option value={120}>2 minutes</option>
                </select>
              </label>
              <Button type="submit" variant="outline" size="sm">
                Save
              </Button>
            </form>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              {settings.targetPoints} points to win ·{" "}
              {settings.turnTimeSeconds ? `${settings.turnTimeSeconds}s per turn` : "untimed turns"}
            </p>
          )}

          {isHost ? (
            <form action={startGameAction.bind(null, game.id)}>
              <Button type="submit" className="w-full" disabled={!canStart}>
                {canStart ? `Start game (${game.players.length} players)` : "Waiting for another player"}
              </Button>
            </form>
          ) : (
            <p className="text-center text-sm font-medium">Waiting for the host to start…</p>
          )}

          <form action={leaveAction.bind(null, game.id)}>
            <Button type="submit" variant="ghost" className="w-full">
              {isHost ? "Cancel game" : "Leave"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
