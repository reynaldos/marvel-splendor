import { prisma } from "@/lib/db";
import type { FeedbackRow } from "@/lib/feedback";

/** Everything players have sent, for the admin's table. Newest change first; the table sorts from there. */
export async function loadFeedback(): Promise<FeedbackRow[]> {
  const rows = await prisma.feedback.findMany({
    orderBy: { updatedAt: "desc" },
    include: { user: { select: { username: true } } },
  });
  return rows.map(({ user, createdAt, updatedAt, ...row }) => ({
    ...row,
    username: user.username,
    createdAt: createdAt.getTime(),
    updatedAt: updatedAt.getTime(),
  }));
}
