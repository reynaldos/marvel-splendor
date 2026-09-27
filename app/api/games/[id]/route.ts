import { NextResponse } from "next/server";

import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import type { GameState } from "@/lib/engine/types";
import { redactState } from "@/lib/game-view";
import { getOrCreateUser } from "@/lib/get-or-create-user";

/**
 * GET /api/games/[id] — the redacted view for whichever seat the requester
 * occupies (ARCHITECTURE.md §6 `games/[id]/route.ts`). Every OTHER player's
 * hand is still visible (tokens, points, bonuses, cards are public in
 * Splendor) except their blind-reserved cards, which redactState withholds.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      players: {
        include: { user: { select: { username: true } } },
        orderBy: { seat: "asc" },
      },
    },
  });
  if (!game) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }

  // GamePlayer.userId is our local User.id, not the Auth0 sub, so resolve
  // the local user first before matching a seat.
  const localUser = await getOrCreateUser(session.user);
  const seatRow = game.players.find((p) => p.userId === localUser.id);

  if (!seatRow) {
    return NextResponse.json({ error: "You are not a participant in this game." }, { status: 403 });
  }

  const state = game.state as unknown as GameState;

  return NextResponse.json({
    id: game.id,
    status: game.status,
    mode: game.mode,
    winnerSeat: game.winnerSeat,
    version: game.version,
    players: game.players.map((p) => ({
      seat: p.seat,
      isBot: p.isBot,
      userId: p.userId,
      name: p.isBot ? "Bot" : p.user?.username ?? p.guestName ?? "Player",
    })),
    view: redactState(state, seatRow.seat),
  });
}
