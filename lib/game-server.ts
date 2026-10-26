/**
 * Server-side glue between the pure engine (lib/engine/*), the bot policy
 * (lib/bot/policy.ts), and the API routes/Prisma. None of this is engine
 * code — it's the "who's a bot, keep running the loop until a human is
 * actually up" orchestration described in ARCHITECTURE.md §5 ("vs-Bot games
 * skip Pusher entirely: the move POST response contains the bot's reply
 * move(s) and new view") and this task's zero-legal-moves correction.
 */
import { randomInt, randomUUID } from "node:crypto";

import { isAway } from "@/lib/engine/types";
import { applyAny, chooseBotAny, legalAny, validateAny, type AnyMove, type AnyState } from "@/lib/game-rules";
import { Prisma } from "@/lib/generated/prisma/client";

export interface AppliedMove {
  seat: number;
  move: AnyMove;
  /** The `Move` row ordinal this application corresponds to (== moveCount before applying). */
  ordinal: number;
}

/**
 * Advances `state` past every seat the caller marks as a bot, AND past any
 * seat (bot or human) that currently has zero legal moves — the game owner's
 * correction to ARCHITECTURE.md §5: a stuck seat loses its turn via the same
 * `TIMEOUT_SKIP` move a timeout would use, not just on a timer expiry.
 * Stops as soon as the game finishes, or it's a human seat's turn *and* that
 * seat has at least one legal move (i.e. the human actually needs to act).
 *
 * Every bot-chosen move is re-validated before being applied — if the bot
 * policy ever produces something `validateMove` rejects, that's a bug in the
 * policy, not a recoverable runtime condition, so this throws loudly instead
 * of silently skipping the bot's turn.
 */
export function runServerTurnLoop(
  initialState: AnyState,
  isBotSeat: (seat: number) => boolean,
): { state: AnyState; applied: AppliedMove[] } {
  let state = initialState;
  const applied: AppliedMove[] = [];

  while (state.status === "active") {
    const seat = state.currentSeat;
    const ordinal = state.moveCount;

    if (legalAny(state, seat).length === 0) {
      const move: AnyMove = { type: "TIMEOUT_SKIP", stuck: true };
      state = applyAny(state, seat, move);
      applied.push({ seat, move, ordinal });
      continue;
    }

    // A bot also plays for anyone who has been away too long, while somebody is still here.
    if (!isBotSeat(seat)) {
      const someoneIsHere = state.players.some((p) => !isBotSeat(p.seat) && !isAway(p));
      if (!isAway(state.players[seat]) || !someoneIsHere) break;
    }

    const move = chooseBotAny(state, seat);
    const validation = validateAny(state, seat, move);
    if (!validation.ok) {
      throw new Error(
        `Bot policy produced an illegal move for seat ${seat}: ${validation.reason}. ` +
          `move=${JSON.stringify(move)}`,
      );
    }
    state = applyAny(state, seat, move);
    applied.push({ seat, move, ordinal });
  }

  return { state, applied };
}

/** A fresh, reproducible-from-storage seed for `createGame`. */
export function generateSeed(): string {
  return randomUUID();
}

const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity
const JOIN_CODE_LENGTH = 6;

/** A random human-friendly join code. vs-bot games don't use it for joining
 * (Phase 2's join-by-code flow), but `Game.joinCode` is a required unique
 * column, so every game — vs-bot included — gets one. */
export function generateJoinCode(): string {
  let code = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    code += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)];
  }
  return code;
}

/** True when `error` is Prisma's unique-constraint violation on `field`. */
export function isUniqueViolation(error: unknown, field: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }
  const target = error.meta?.target;
  if (Array.isArray(target)) return target.includes(field);
  if (typeof target === "string") return target.includes(field);
  return false;
}
