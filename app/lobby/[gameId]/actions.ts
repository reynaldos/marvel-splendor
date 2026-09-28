"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { createGame } from "@/lib/engine/setup";
import { BOT_DIFFICULTIES, DEFAULT_SETTINGS, type GameSettings } from "@/lib/engine/types";
import { runServerTurnLoop } from "@/lib/game-server";
import { Prisma } from "@/lib/generated/prisma/client";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { MAX_SEATS, nextFreeSeat } from "@/lib/lobby";
import { tableOrder } from "@/lib/lobby-rules";
import { notifyGame } from "@/lib/pusher";

const HOST_SEAT = 0;

function settingsOf(game: { settings: unknown }): GameSettings {
  return { ...DEFAULT_SETTINGS, ...(game.settings as Partial<GameSettings>) };
}

async function saveSettings(gameId: string, settings: GameSettings) {
  await prisma.game.update({
    where: { id: gameId },
    data: { settings: settings as unknown as Prisma.InputJsonValue },
  });
}

/** The caller's seat in a game that is still in the lobby, or a redirect away. */
async function requireLobbySeat(gameId: string) {
  const session = await auth0.getSession();
  if (!session) redirect(`/auth/login?returnTo=/lobby/${gameId}`);
  const user = await getOrCreateUser(session.user);

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { players: { orderBy: { seat: "asc" } } },
  });
  const me = game?.players.find((p) => p.userId === user.id);
  if (!game || !me) redirect("/");
  if (game.status !== "LOBBY") redirect(`/play/${gameId}`);

  return { game, me, isHost: me.seat === HOST_SEAT };
}

async function changed(gameId: string) {
  await notifyGame(gameId);
  refresh();
}

export async function addBotAction(gameId: string) {
  const { game, isHost } = await requireLobbySeat(gameId);
  if (!isHost) return;
  const seat = nextFreeSeat(game.players.map((p) => p.seat));
  if (seat === null) return;
  // A seat taken in the meantime fails the unique constraint; the host can just tap again.
  await prisma.gamePlayer.create({ data: { gameId, seat, isBot: true } }).catch(() => null);
  await changed(gameId);
}

export async function removeBotAction(gameId: string, seat: number) {
  const { game, isHost } = await requireLobbySeat(gameId);
  if (!isHost) return;
  await prisma.gamePlayer.deleteMany({ where: { gameId, seat, isBot: true } });
  // The next bot in this seat starts at the default level, not this one's.
  const settings = settingsOf(game);
  const levels = { ...settings.botDifficultyBySeat };
  delete levels[seat];
  await saveSettings(gameId, { ...settings, botDifficultyBySeat: levels });
  await changed(gameId);
}

export async function setBotDifficultyAction(gameId: string, seat: number, formData: FormData) {
  const { game, isHost } = await requireLobbySeat(gameId);
  const difficulty = BOT_DIFFICULTIES.find((d) => d === formData.get("difficulty"));
  if (!isHost || !difficulty || !game.players.some((p) => p.seat === seat && p.isBot)) return;

  const settings = settingsOf(game);
  await saveSettings(gameId, {
    ...settings,
    botDifficultyBySeat: { ...settings.botDifficultyBySeat, [seat]: difficulty },
  });
  await changed(gameId);
}

/** A guest gives up their seat; the host leaving closes the table for everyone. */
export async function leaveAction(gameId: string) {
  const { me, isHost } = await requireLobbySeat(gameId);
  if (isHost) {
    await prisma.game.delete({ where: { id: gameId } });
  } else {
    await prisma.gamePlayer.delete({ where: { id: me.id } });
  }
  await notifyGame(gameId);
  redirect("/");
}

export async function startGameAction(gameId: string) {
  const { game, isHost } = await requireLobbySeat(gameId);
  if (!isHost || game.players.length < 2 || game.players.length > MAX_SEATS) return;

  // The engine needs seats 0..n-1: people first, as the lobby showed them.
  const seated = tableOrder(game.players).map((p, seat) => ({ id: p.id, from: p.seat, seat, isBot: p.isBot }));

  const lobby = settingsOf(game);
  const settings: GameSettings = {
    ...lobby,
    botDifficulty: "normal",
    // Each bot's level follows it to its final seat.
    botDifficultyBySeat: Object.fromEntries(
      seated.flatMap((p) => {
        const level = p.isBot ? lobby.botDifficultyBySeat?.[p.from] : undefined;
        return level ? [[p.seat, level]] : [];
      }),
    ),
  };

  const dealt = createGame(seated.length, game.seed, settings);
  // If a bot drew the first turn, play it now so the first human sees a board they can act on.
  const { state, applied } = runServerTurnLoop(dealt, (seat) => seated[seat].isBot);

  const started = await prisma.$transaction(async (tx) => {
    // Only one start can win; a double tap or a second tab finds no LOBBY row.
    const claimed = await tx.game.updateMany({
      where: { id: gameId, status: "LOBBY" },
      data: {
        status: state.status === "finished" ? "FINISHED" : "ACTIVE",
        settings: settings as unknown as Prisma.InputJsonValue,
        state: state as unknown as Prisma.InputJsonValue,
        winnerSeat: state.winnerSeat,
      },
    });
    if (claimed.count === 0) return false;

    // Two passes, so no one lands on a seat someone else hasn't left yet.
    const moving = seated.filter((p) => p.from !== p.seat);
    for (const p of moving) {
      await tx.gamePlayer.update({ where: { id: p.id }, data: { seat: MAX_SEATS + p.seat } });
    }
    for (const p of moving) {
      await tx.gamePlayer.update({ where: { id: p.id }, data: { seat: p.seat } });
    }
    if (applied.length > 0) {
      await tx.move.createMany({
        data: applied.map((m) => ({
          gameId,
          ordinal: m.ordinal,
          seat: m.seat,
          payload: m.move as unknown as Prisma.InputJsonValue,
        })),
      });
    }
    return true;
  });

  if (started) await notifyGame(gameId);
  redirect(`/play/${gameId}`);
}
