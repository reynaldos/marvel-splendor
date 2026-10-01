"use server";

import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { FEEDBACK_MAX } from "@/lib/feedback";
import type { FeedbackKind } from "@/lib/generated/prisma/enums";
import { getOrCreateUser } from "@/lib/get-or-create-user";

/** A pause between one player's submissions, so a stuck button can't flood the list. */
const COOLDOWN_MS = 10_000;

/** Saves what a player typed in the menu's Feedback form, as new for the admins to read. */
export async function submitFeedbackAction(kind: FeedbackKind, body: string): Promise<{ ok: boolean; message: string }> {
  const session = await auth0.getSession();
  if (!session) return { ok: false, message: "Sign in to send feedback." };
  const user = await getOrCreateUser(session.user);

  const text = body.trim();
  if (!text) return { ok: false, message: "Write something first." };
  if (text.length > FEEDBACK_MAX) return { ok: false, message: `Keep it under ${FEEDBACK_MAX} characters.` };

  const last = await prisma.feedback.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
  if (last && Date.now() - last.createdAt.getTime() < COOLDOWN_MS) return { ok: false, message: "Give it a moment before sending another." };

  await prisma.feedback.create({ data: { userId: user.id, kind, body: text } });
  return { ok: true, message: kind === "BUG" ? "Thanks, we'll look into it." : "Thanks, it's on the list." };
}
