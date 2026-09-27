"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { createGame } from "@/lib/engine/setup";
import { DEFAULT_SETTINGS, type GameSettings } from "@/lib/engine/types";
import { runServerTurnLoop } from "@/lib/game-server";
import { Prisma } from "@/lib/generated/prisma/client";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { MAX_SEATS, nextFreeSeat } from "@/lib/lobby";
import { notifyGame } from "@/lib/pusher";

const HOST_SEAT = 0;
const TURN_TIMES = [15, 30, 60, 120];

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
  const { isHost } = await requireLobbySeat(gameId);
  if (!isHost) return;
  await prisma.gamePlayer.deleteMany({ where: { gameId, seat, isBot: true } });
  await changed(gameId);
}

export async function updateSettingsAction(gameId: string, formData: FormData) {
  const { game, isHost } = await requireLobbySeat(gameId);
  if (!isHost) return;

  const targetPoints = Number(formData.get("targetPoints"));
  const turnTime = Number(formData.get("turnTimeSeconds"));
  if (!Number.isInteger(targetPoints) || targetPoints < 1 || targetPoints > 99) return;

  const settings: GameSettings = {
    ...DEFAULT_SETTINGS,
    ...(game.settings as unknown as Partial<GameSettings>),
    targetPoints,
    turnTimeSeconds: TURN_TIMES.includes(turnTime) ? (turnTime as GameSettings["turnTimeSeconds"]) : null,
  };
  await prisma.game.update({
    where: { id: gameId },
    data: { settings: settings as unknown as Prisma.InputJsonValue },
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

  const settings: GameSettings = {
    ...DEFAULT_SETTINGS,
    ...(game.settings as unknown as Partial<GameSettings>),
    botDifficulty: "normal",
  };
  // Someone leaving can open a gap (seats 0 and 2); the engine needs 0..n-1.
  const seated = game.players.map((p, seat) => ({ id: p.id, from: p.seat, seat, isBot: p.isBot }));

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

    // Ascending order: each target seat is one a lower player just vacated.
    for (const p of seated) {
      if (p.from !== p.seat) await tx.gamePlayer.update({ where: { id: p.id }, data: { seat: p.seat } });
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
