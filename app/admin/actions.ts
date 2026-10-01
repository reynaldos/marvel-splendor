"use server";

import { refresh } from "next/cache";

import { isAdmin } from "@/lib/admin";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { FEEDBACK_STATUSES } from "@/lib/feedback";
import type { FeedbackStatus } from "@/lib/generated/prisma/enums";

/** The admins' note on a piece of feedback; blank clears it. */
export async function setFeedbackNoteAction(id: string, note: string): Promise<void> {
  const session = await auth0.getSession();
  if (!session || !isAdmin(session.user)) return;
  await prisma.feedback.update({ where: { id }, data: { note: note.trim() || null } });
  refresh();
}

/** Moves a piece of feedback along: new, roadmap, in progress, or completed. Admins only. */
export async function setFeedbackStatusAction(id: string, status: FeedbackStatus): Promise<void> {
  const session = await auth0.getSession();
  if (!session || !isAdmin(session.user) || !FEEDBACK_STATUSES.includes(status)) return;
  await prisma.feedback.update({ where: { id }, data: { status } });
  refresh();
}
