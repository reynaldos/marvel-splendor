import { z } from "zod";

/** Sent on the game's channel with a `ChatBubble`. */
export const CHAT_EVENT = "chat";
/** The wait between one send and the next, for each player. */
export const CHAT_COOLDOWN_MS = 3000;

export const EMOJIS = ["👍", "😂", "😮", "😢", "😴" ,"😡", "🔥", "🫡",] as const;
// Kept short: each has to fit across a player's name.
export const MESSAGES = [
  "Good luck!",
  "Nice move!",
  "So close!",
  "Oops!",
  "Thanks!",
  "Please make a move.",
  "Avengers, assemble!",
  "I am inevitable.",
  "Good game!",
] as const;

/** Only what is on the lists can be sent, so nothing needs moderating. */
export const ChatSchema = z.union([
  z.object({ kind: z.literal("REACTION"), body: z.enum(EMOJIS) }),
  z.object({ kind: z.literal("TEXT"), body: z.enum(MESSAGES) }),
]);

export type ChatBubble = z.infer<typeof ChatSchema> & { seat: number };

/** How long until this player may send again; 0 when they may. */
export function cooldownLeftMs(lastSentAt: number | null, now = Date.now()): number {
  return lastSentAt === null ? 0 : Math.max(0, lastSentAt + CHAT_COOLDOWN_MS - now);
}
