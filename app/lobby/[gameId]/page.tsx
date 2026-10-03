import { TopBar } from "@/components/TopBar";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LobbyLive } from "@/components/lobby/LobbyLive";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { NOTICE_BUTTON, NoticeScreen } from "@/components/lobby/NoticeScreen";
import { auth0 } from "@/lib/auth0";
import { botAvatarKeys } from "@/lib/avatars";
import { prisma } from "@/lib/db";
import { DEFAULT_SETTINGS, type GameSettings } from "@/lib/engine/types";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { closeIfHostGone, hostAwayUntil, MAX_SEATS, withCheat } from "@/lib/lobby";
import { botName, tableOrder } from "@/lib/lobby-rules";
import { publicAvatarUrl } from "@/lib/r2";
import { pageMetadata } from "@/lib/site";

import {
  addBotAction,
  leaveAction,
  removeBotAction,
  setBotDifficultyAction,
  startGameAction,
} from "./actions";

export const metadata = pageMetadata("Game Lobby", "Waiting for players to take their seats.", true);

// Server-rendered; LobbyLive re-renders it whenever the table changes.
export default async function LobbyPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ cheat?: string }>;
}) {
  const { gameId } = await params;
  // Carried from the lobby on to the board.
  const cheat = (await searchParams).cheat === "true";

  const session = await auth0.getSession();
  if (!session) {
    redirect(`/auth/login?returnTo=/lobby/${gameId}`);
  }
  const user = await getOrCreateUser(session.user);

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      players: { include: { user: { select: { username: true, avatarKey: true } } }, orderBy: { seat: "asc" } },
    },
  });
  // Where guests land when the host cancels: the lobby refreshes and the game is gone.
  if (!game) {
    return (
      <NoticeScreen title="Game cancelled" message="The host closed this room. Ask them for a new code, or start a game of your own.">
        <Link href="/" className={NOTICE_BUTTON}>
          Back to home
        </Link>
      </NoticeScreen>
    );
  }

  const mySeat = game.players.find((p) => p.userId === user.id);
  // Not seated yet: the join page seats you, or explains why it can't.
  if (!mySeat) redirect(`/join/${game.joinCode}`);
  // A room whose host stayed away too long closes on everyone in it; the state still says they left.
  const awayUntil = hostAwayUntil(game);
  if (awayUntil !== null && (await closeIfHostGone(game))) {
    return (
      <NoticeScreen title="Room closed" message="The host left and didn't come back in time. Ask them for a new code, or start a game of your own.">
        <Link href="/" className={NOTICE_BUTTON}>
          Back to home
        </Link>
      </NoticeScreen>
    );
  }
  if (game.status !== "LOBBY") redirect(withCheat(`/play/${game.id}`, cheat));

  const settings = { ...DEFAULT_SETTINGS, ...(game.settings as unknown as Partial<GameSettings>) };
  const botAvatars = botAvatarKeys(game.seed, game.players);

  return (
    <>
      <TopBar />
      <LobbyLive gameId={game.id} isHost={mySeat.seat === 0} hostAwayUntil={awayUntil} />
      <LobbyScreen
        joinCode={game.joinCode}
        hostAwayUntil={awayUntil}
        seats={Array.from({ length: MAX_SEATS }, (_, i) => {
          const player = tableOrder(game.players)[i];
          if (!player) return null;
          return {
            seat: player.seat,
            name: player.isBot ? botName(game.players, player.seat) : (player.user?.username ?? "Player"),
            avatarUrl: publicAvatarUrl(player.isBot ? botAvatars.get(player.seat) : player.user?.avatarKey),
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
        onStart={startGameAction.bind(null, game.id, cheat)}
        onLeave={leaveAction.bind(null, game.id)}
      />
    </>
  );
}
