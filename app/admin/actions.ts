"use server";

import { refresh } from "next/cache";

import { isAdmin } from "@/lib/admin";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { FEEDBACK_STATUSES } from "@/lib/feedback";
import type { FeedbackStatus } from "@/lib/generated/prisma/enums";
import { rebuildRecords } from "@/lib/replay-records";
import { sweepDeadGames } from "@/lib/sweep-games";

/** The admins' note on a piece of feedback; blank clears it. */
export async function setFeedbackNoteAction(id: string, note: string): Promise<void> {
  const session = await auth0.getSession();
  if (!session || !isAdmin(session.user)) return;
  await prisma.feedback.update({ where: { id }, data: { note: note.trim() || null } });
  refresh();
}

/**
 * Deletes a game with its moves, seats and chat. A finished game had counted toward its players' records, so
 * those are then set to what the games that remain say. Admins only.
 */
export async function deleteGameAction(id: string): Promise<void> {
  const session = await auth0.getSession();
  if (!session || !isAdmin(session.user)) return;
  const game = await prisma.game.delete({ where: { id }, select: { status: true } });
  if (game.status === "FINISHED") await rebuildRecords();
  refresh();
}

/** Closes the games left open past their idle time, as the daily cron does. Admins only. */
export async function closeDeadGamesAction(): Promise<void> {
  const session = await auth0.getSession();
  if (!session || !isAdmin(session.user)) return;
  await sweepDeadGames();
  refresh();
}

/** Moves a piece of feedback along: new, roadmap, in progress, or completed. Admins only. */
export async function setFeedbackStatusAction(id: string, status: FeedbackStatus): Promise<void> {
  const session = await auth0.getSession();
  if (!session || !isAdmin(session.user) || !FEEDBACK_STATUSES.includes(status)) return;
  await prisma.feedback.update({ where: { id }, data: { status } });
  refresh();
}
