import type { FeedbackKind, FeedbackStatus } from "@/lib/generated/prisma/enums";

export const FEEDBACK_MAX = 1000;

export const FEEDBACK_KIND_LABEL: Record<FeedbackKind, string> = {
  FEATURE: "Feature request",
  BUG: "Bug report",
  CHARACTER: "Character request",
};

/** In the order they are offered to the admin, from untouched to done. */
export const FEEDBACK_STATUSES: FeedbackStatus[] = ["NEW", "ROADMAP", "IN_PROGRESS", "COMPLETED"];
export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  NEW: "New",
  ROADMAP: "Roadmap",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

export interface FeedbackRow {
  id: string;
  kind: FeedbackKind;
  status: FeedbackStatus;
  body: string;
  /** The admins' own note on it, if they left one. */
  note: string | null;
  username: string;
  /** Epoch ms, so the row can travel to the browser. */
  createdAt: number;
  updatedAt: number;
}
