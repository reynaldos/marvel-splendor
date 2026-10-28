import { NextResponse } from "next/server";

import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { turnEndsInMs } from "@/lib/game-replay";
import type { AnyState } from "@/lib/game-rules";
import { Prisma } from "@/lib/generated/prisma/client";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { playsBotsOnly } from "@/lib/lobby-rules";

/**
 * POST /api/games/[id]/pause — { paused: boolean }. Pauses a game against bots, or resumes it with a fresh
 * turn clock. The flag lives in the stored state, where the routes read it; the views never carry it.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const user = await getOrCreateUser(session.user);

  const body = await request.json().catch(() => null);
  if (typeof body?.paused !== "boolean") return NextResponse.json({ error: "Expected { paused: boolean }." }, { status: 400 });

  const game = await prisma.game.findUnique({ where: { id }, include: { players: { select: { userId: true, isBot: true } } } });
  if (!game) return NextResponse.json({ error: "Game not found." }, { status: 404 });
  if (!game.players.some((p) => p.userId === user.id)) return NextResponse.json({ error: "You are not a participant in this game." }, { status: 403 });
  if (!playsBotsOnly(game.players)) return NextResponse.json({ error: "Only a game against bots can be paused." }, { status: 400 });
  if (game.status !== "ACTIVE") return NextResponse.json({ error: "This game is not active." }, { status: 400 });

  const state = { ...(game.state as unknown as AnyState), paused: body.paused };
  const now = new Date();
  // Resuming starts the turn over; a move landing meanwhile bumps the version, and the pause is refused.
  const { count } = await prisma.game.updateMany({
    where: { id, version: game.version },
    data: { state: state as unknown as Prisma.InputJsonValue, version: game.version + 1, updatedAt: body.paused ? game.updatedAt : now },
  });
  if (count === 0) return NextResponse.json({ error: "Game was updated concurrently — please refresh and retry." }, { status: 409 });

  return NextResponse.json({ paused: body.paused, turnEndsInMs: turnEndsInMs(state, now, now.getTime()) });
}
