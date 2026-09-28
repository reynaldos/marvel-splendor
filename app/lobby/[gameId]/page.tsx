import type { Viewport } from "next";
import { notFound, redirect } from "next/navigation";

import { LobbyLive } from "@/components/lobby/LobbyLive";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { DEFAULT_SETTINGS, type GameSettings } from "@/lib/engine/types";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { MAX_SEATS } from "@/lib/lobby";
import { tableOrder } from "@/lib/lobby-rules";

import {
  addBotAction,
  leaveAction,
  removeBotAction,
  setBotDifficultyAction,
  startGameAction,
} from "./actions";

// Draw under the phone's notch margins; the stage pads the content back out.
export const viewport: Viewport = { viewportFit: "cover" };

// Server-rendered; LobbyLive re-renders it whenever the table changes.
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

  const settings = { ...DEFAULT_SETTINGS, ...(game.settings as unknown as Partial<GameSettings>) };

  return (
    <>
      <LobbyLive gameId={game.id} />
      <LobbyScreen
        joinCode={game.joinCode}
        shareUrl={`${process.env.APP_BASE_URL ?? ""}/join/${game.joinCode}`}
        seats={Array.from({ length: MAX_SEATS }, (_, i) => {
          const player = tableOrder(game.players)[i];
          if (!player) return null;
          return {
            seat: player.seat,
            name: player.isBot ? "Bot" : (player.user?.username ?? "Player"),
            isBot: player.isBot,
            isHost: player.seat === 0,
            isYou: player.userId === user.id,
            difficulty: player.isBot ? (settings.botDifficultyBySeat?.[player.seat] ?? "normal") : undefined,
          };
        })}
        isHost={mySeat.seat === 0}
        targetPoints={settings.targetPoints}
        turnTimeSeconds={settings.turnTimeSeconds}
        onAddBot={addBotAction.bind(null, game.id)}
        onRemoveBot={(seat) => removeBotAction.bind(null, game.id, seat)}
        onSetBotDifficulty={(seat) => setBotDifficultyAction.bind(null, game.id, seat)}
        onStart={startGameAction.bind(null, game.id)}
        onLeave={leaveAction.bind(null, game.id)}
      />
    </>
  );
}
