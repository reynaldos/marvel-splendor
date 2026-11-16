import { TopBar } from "@/components/TopBar";
import Link from "next/link";
import { redirect } from "next/navigation";

import { InviteDialog } from "@/components/friends/InviteDialog";
import { InviteFriends } from "@/components/lobby/InviteFriends";
import { LobbyLive } from "@/components/lobby/LobbyLive";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { NOTICE_BUTTON, NoticeScreen } from "@/components/lobby/NoticeScreen";
import { auth0 } from "@/lib/auth0";
import { botAvatarKeys } from "@/lib/avatars";
import { prisma } from "@/lib/db";
import { DEFAULT_SETTINGS, type GameSettings } from "@/lib/engine/types";
import { roomOf } from "@/lib/friends";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { INVITE_MESSAGES, inviteClosedReason, roomLine } from "@/lib/invite-rules";
import { inviteFor, invitableFriends } from "@/lib/invites";
import { closeIfHostGone, hostAwayUntil, seatsOf, withCheat } from "@/lib/lobby";
import { botName, tableOrder } from "@/lib/lobby-rules";
import { publicAvatarUrl } from "@/lib/r2";
import { pageMetadata } from "@/lib/site";

import {
  addBotAction,
  inviteFriendAction,
  leaveAction,
  removeBotAction,
  respondInviteAction,
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
  searchParams: Promise<{ cheat?: string; invite?: string }>;
}) {
  const { gameId } = await params;
  const query = await searchParams;
  // Carried from the lobby on to the board.
  const cheat = query.cheat === "true";

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

  const settings = { ...DEFAULT_SETTINGS, ...(game.settings as unknown as Partial<GameSettings>) };
  const botAvatars = botAvatarKeys(game.seed, game.players);
  const seats = Array.from({ length: seatsOf(game.settings) }, (_, i) => {
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
  });
  const table = {
    joinCode: game.joinCode,
    seats,
    targetPoints: settings.targetPoints,
    duel: settings.rules === "duel",
    turnTimeSeconds: settings.turnTimeSeconds,
    gameTimeMinutes: settings.gameTimeMinutes,
    onAddBot: addBotAction.bind(null, game.id),
    onRemoveBot: (seat: number) => removeBotAction.bind(null, game.id, seat),
    onSetBotDifficulty: (seat: number) => setBotDifficultyAction.bind(null, game.id, seat),
    onStart: startGameAction.bind(null, game.id, cheat),
    onLeave: leaveAction.bind(null, game.id),
  };

  const mySeat = game.players.find((p) => p.userId === user.id);
  if (!mySeat) {
    // Invited: the room as it is, under the Join or Decline question. Anyone else goes to the join page, which seats them or says why not.
    const invite = query.invite ? await inviteFor(user.id, query.invite, game.id) : null;
    if (!invite) redirect(`/join/${game.joinCode}`);
    const room = roomOf({ ...game, _count: { players: game.players.length } });
    const reason = invite.status === "DECLINED" ? INVITE_MESSAGES.declined : invite.status === "ACCEPTED" ? "You already joined this room." : inviteClosedReason(room);
    if (reason) {
      return (
        <NoticeScreen title="Invite" message={reason}>
          <Link href="/" className={NOTICE_BUTTON}>
            Back to home
          </Link>
        </NoticeScreen>
      );
    }
    return (
      <>
        <TopBar />
        <LobbyLive gameId={game.id} isHost={false} hostAwayUntil={room.hostAwayUntil} />
        <LobbyScreen {...table} hostAwayUntil={room.hostAwayUntil} isHost={false} />
        <InviteDialog gameId={game.id} from={invite.from} line={roomLine(room)} onRespond={respondInviteAction.bind(null, game.id, query.invite!)} />
      </>
    );
  }
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

  const seatedIds = game.players.flatMap((p) => (p.userId ? [p.userId] : []));
  const friends = await invitableFriends(user.id, game.id, seatedIds);

  return (
    <>
      <TopBar />
      <LobbyLive gameId={game.id} isHost={mySeat.seat === 0} hostAwayUntil={awayUntil} />
      <LobbyScreen
        {...table}
        hostAwayUntil={awayUntil}
        isHost={mySeat.seat === 0}
        besideCode={<InviteFriends friends={friends} full={game.players.length >= seats.length} onInvite={inviteFriendAction.bind(null, game.id)} />}
      />
    </>
  );
}
