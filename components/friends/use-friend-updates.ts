"use client";

import { useEffect, useRef } from "react";
import Pusher from "pusher-js";

import { FRIENDS_UPDATED_EVENT, userChannel } from "@/lib/user-channel";

/** Safety net for a missed signal, and the only way when Pusher isn't set up. */
const FALLBACK_POLL_MS = 30_000;

/**
 * Calls `onUpdate` whenever this player's friends or invites change: on the private Pusher signal,
 * when the tab becomes visible again, and on a slow timer. `onUpdate` should refetch.
 * Off (no channel, no timer) when `userId` is null, as on the preview page.
 */
export function useFriendUpdates(userId: string | null, onUpdate: () => void) {
  const latest = useRef(onUpdate);
  useEffect(() => {
    latest.current = onUpdate;
  });

  useEffect(() => {
    if (!userId) return;
    const fire = () => latest.current();

    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    // ponytail: a second connection beside the lobby's game channel; share one client if connection counts matter.
    const pusher = key && cluster ? new Pusher(key, { cluster, channelAuthorization: { endpoint: "/api/pusher/auth", transport: "ajax" } }) : null;
    pusher?.subscribe(userChannel(userId)).bind(FRIENDS_UPDATED_EVENT, fire);
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
  }, [userId]);
}
