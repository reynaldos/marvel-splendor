import { NextResponse } from "next/server";

import { auth0 } from "@/lib/auth0";
import { ChatSchema, cooldownLeftMs } from "@/lib/chat";
import type { AnyState } from "@/lib/game-rules";
import { prisma } from "@/lib/db";
import { isAway,  } from "@/lib/engine/types";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { notifyChat } from "@/lib/pusher";

/** POST /api/games/[id]/chat — send an emoji or a message from the lists to everyone at the table. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const localUser = await getOrCreateUser(session.user);

  const parsed = ChatSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That can't be sent." }, { status: 400 });
  }

  const game = await prisma.game.findUnique({
    where: { id },
    select: { status: true, mode: true, state: true, players: { select: { seat: true, userId: true } } },
  });
  if (!game) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }

  const seat = game.players.find((p) => p.userId === localUser.id)?.seat;
  if (seat === undefined) {
    return NextResponse.json({ error: "You are not a participant in this game." }, { status: 403 });
  }
  // Still open once the game is over, for a "Good game!".
  const open = game.mode === "MULTIPLAYER" && (game.status === "ACTIVE" || game.status === "FINISHED");
  const player = (game.state as unknown as AnyState).players?.[seat];
  if (!open || !player || isAway(player)) {
    return NextResponse.json({ error: "You can't send anything in this game right now." }, { status: 409 });
  }

  // ponytail: two sends at the same instant can both get through; lock the seat if that is ever abused
  const last = await prisma.chatMessage.findFirst({
    where: { gameId: id, seat },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const retryInMs = cooldownLeftMs(last?.createdAt.getTime() ?? null);
  if (retryInMs > 0) {
    return NextResponse.json({ error: "Wait a moment before sending again.", retryInMs }, { status: 429 });
  }

  await prisma.chatMessage.create({ data: { gameId: id, seat, ...parsed.data } });
  await notifyChat(id, { seat, ...parsed.data });

  return NextResponse.json({ ok: true });
}
