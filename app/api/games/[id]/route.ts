import { NextResponse } from "next/server";

import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import type { GameSettings, GameState, Move } from "@/lib/engine/types";
import { gameEndsInMs, replaySteps, turnEndsInMs } from "@/lib/game-replay";
import type { GameRewards } from "@/lib/game-record";
import { redactState } from "@/lib/game-view";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { botName } from "@/lib/lobby-rules";
import { publicAvatarUrl } from "@/lib/r2";

/**
 * GET /api/games/[id] — the redacted view for whichever seat the requester
 * occupies (ARCHITECTURE.md §6 `games/[id]/route.ts`). Every OTHER player's
 * hand is still visible (tokens, points, bonuses, cards are public in
 * Splendor) except their blind-reserved cards, which redactState withholds.
 *
 * `?since=N` (the move count the device last showed) also returns `steps`:
 * the board after each move it missed, so it can play them back in order.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      players: {
        include: { user: { select: { username: true, avatarKey: true } } },
        orderBy: { seat: "asc" },
      },
      moves: { select: { ordinal: true, seat: true, payload: true }, orderBy: { ordinal: "asc" } },
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

  if (game.status === "LOBBY") {
    return NextResponse.json({ error: "This game hasn't started yet." }, { status: 409 });
  }

  const state = game.state as unknown as GameState;
  const moves = game.moves.map((m) => ({
    ordinal: m.ordinal,
    seat: m.seat,
    move: m.payload as unknown as Move,
  }));

  const since = Number(new URL(request.url).searchParams.get("since") ?? NaN);
  const steps =
    Number.isInteger(since) && since >= 0 && since < moves.length
      ? replaySteps({
          seed: game.seed,
          settings: game.settings as unknown as GameSettings,
          playerCount: game.players.length,
          moves,
          since,
          viewerSeat: seatRow.seat,
          finalState: state,
        })
      : null;

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
      name: p.isBot ? botName(game.players, p.seat) : p.user?.username ?? p.guestName ?? "Player",
      avatarUrl: publicAvatarUrl(p.user?.avatarKey),
      rewards: p.rewards as unknown as GameRewards | null,
    })),
    view: redactState(state, seatRow.seat),
    moves,
    steps: steps ?? [],
    turnEndsInMs: game.status === "ACTIVE" ? turnEndsInMs(state, game.updatedAt) : null,
    gameEndsInMs: game.status === "ACTIVE" ? gameEndsInMs(state.settings, game.createdAt) : null,
  });
}
