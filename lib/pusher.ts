/**
 * Server-side Pusher trigger (ARCHITECTURE.md §5). The signal carries no
 * game data — it only tells every device in a game "something changed, fetch
 * your own view" — so nothing hidden (blind reserves, deck order) can leak
 * through it, and the channel needs no per-user authorization.
 */
import Pusher from "pusher";

import { CHAT_EVENT, type ChatBubble } from "@/lib/chat";
import { GAME_UPDATED_EVENT, gameChannel } from "@/lib/game-channel";

let client: Pusher | null | undefined;

function getClient(): Pusher | null {
  if (client !== undefined) return client;
  const { PUSHER_APP_ID, PUSHER_SECRET, NEXT_PUBLIC_PUSHER_KEY, NEXT_PUBLIC_PUSHER_CLUSTER } = process.env;
  if (!PUSHER_APP_ID || !PUSHER_SECRET || !NEXT_PUBLIC_PUSHER_KEY || !NEXT_PUBLIC_PUSHER_CLUSTER) {
    console.warn("Pusher is not configured; live updates are off and clients fall back to slow polling.");
    return (client = null);
  }
  return (client = new Pusher({
    appId: PUSHER_APP_ID,
    key: NEXT_PUBLIC_PUSHER_KEY,
    secret: PUSHER_SECRET,
    cluster: NEXT_PUBLIC_PUSHER_CLUSTER,
    useTLS: true,
  }));
}

/**
 * Tells every device watching this game to refetch. Never throws: the change
 * is already saved, and clients re-check on a timer, so a failed signal only
 * delays what they see.
 */
export async function notifyGame(gameId: string): Promise<void> {
  await trigger(gameId, GAME_UPDATED_EVENT, {});
}

/** Shows everyone at the table what a player sent. It is meant for all of them, so it travels in the signal. */
export async function notifyChat(gameId: string, bubble: ChatBubble): Promise<void> {
  await trigger(gameId, CHAT_EVENT, bubble);
}

async function trigger(gameId: string, event: string, payload: object): Promise<void> {
  try {
    await getClient()?.trigger(gameChannel(gameId), event, payload);
  } catch (error) {
    console.error("Pusher trigger failed", error);
  }
}
