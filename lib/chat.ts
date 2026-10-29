import { z } from "zod";

/** Sent on the game's channel with a `ChatBubble`. */
export const CHAT_EVENT = "chat";
/** The wait between one send and the next, for each player. */
export const CHAT_COOLDOWN_MS = 6000;
/** How long it is shown on the sender's card. */
export const CHAT_BUBBLE_MS = 3000;

export const EMOJIS = ["👀", "😂", "😮", "😢", "😴", "😡", "💀", "🫡"] as const;
// Kept short: each has to fit across a player's name.
export const MESSAGES = [
  "That card is mine!",
  "Nice move!",
  "So close!",
  "Oops!",
  "Thanks!",
  "Please make a move...",
  "Avengers, assemble!",
  "I am inevitable.",
  "Good game!",
  "I can do this all day.",
] as const;

/** Only what is on the lists can be sent, so nothing needs moderating. */
export const ChatSchema = z.union([
  z.object({ kind: z.literal("REACTION"), body: z.enum(EMOJIS) }),
  z.object({ kind: z.literal("TEXT"), body: z.enum(MESSAGES) }),
]);

/** What a player picks to send. */
export type ChatSend = z.infer<typeof ChatSchema>;
export type ChatBubble = ChatSend & { seat: number };

/** What arrives on the channel. Checked for shape only: a device on an older version may not know every message. */
export const ChatBubbleSchema = z.object({
  seat: z.number().int().nonnegative(),
  kind: z.enum(["REACTION", "TEXT"]),
  body: z.string().min(1).max(40),
});

/** How long until this player may send again; 0 when they may. */
export function cooldownLeftMs(lastSentAt: number | null, now = Date.now()): number {
  return lastSentAt === null ? 0 : Math.max(0, lastSentAt + CHAT_COOLDOWN_MS - now);
}
