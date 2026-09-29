"use client";

import { useEffect, useRef } from "react";
import Pusher from "pusher-js";

import { CHAT_EVENT } from "@/lib/chat";
import { GAME_UPDATED_EVENT, gameChannel } from "@/lib/game-channel";

/** Safety net for a missed signal (phone asleep, connection dropped). */
const FALLBACK_POLL_MS = 15_000;

/**
 * Calls `onUpdate` whenever this game changes on the server: on the live
 * Pusher signal, when the tab becomes visible again, and on a slow timer.
 * `onUpdate` should refetch; it may be called when nothing changed.
 * `onChat` is handed what a player sent to the table, as it arrived.
 */
export function useGameUpdates(gameId: string, onUpdate: () => void, onChat?: (sent: unknown) => void) {
  const latest = useRef(onUpdate);
  const latestChat = useRef(onChat);
  useEffect(() => {
    latest.current = onUpdate;
    latestChat.current = onChat;
  });

  useEffect(() => {
    const fire = () => latest.current();

    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    const pusher = key && cluster ? new Pusher(key, { cluster }) : null;
    const channel = pusher?.subscribe(gameChannel(gameId));
    channel?.bind(GAME_UPDATED_EVENT, fire);
    channel?.bind(CHAT_EVENT, (sent: unknown) => latestChat.current?.(sent));
    // A dropped connection may have missed signals; catch up once it's back.
    pusher?.connection.bind("connected", fire);

    const poll = setInterval(fire, FALLBACK_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") fire();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      pusher?.disconnect();
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [gameId]);
}
