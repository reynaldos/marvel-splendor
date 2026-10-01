"use client";

import { useCallback, useState } from "react";
import { cn } from "cn";

import { playSfx } from "@/components/audio";
import { CHAT_BUBBLE_MS } from "@/lib/chat";

interface Sent {
  kind: "REACTION" | "TEXT";
  body: string;
}
/** `key` tells one send from the next, so the same thing sent twice pops in twice. */
export type ShownBubble = Sent & { key: number };
export type Bubbles = Record<number, ShownBubble | undefined>;

/** What each seat is showing, and a way to show something: it is taken away when its time is up. */
export function useChatBubbles() {
  const [bubbles, setBubbles] = useState<Bubbles>({});

  const show = useCallback((seat: number, { kind, body }: Sent) => {
    playSfx("chat");
    const key = Date.now();
    setBubbles((shown) => ({ ...shown, [seat]: { kind, body, key } }));
    // A newer one from the same player has taken its place, and leaves in its own time.
    setTimeout(
      () => setBubbles((shown) => (shown[seat]?.key === key ? { ...shown, [seat]: undefined } : shown)),
      CHAT_BUBBLE_MS,
    );
  }, []);

  return [bubbles, show] as const;
}

/**
 * What a player sent, beside their card and level with their name: it pops in,
 * holds and pops out. It is as wide as what it says, and a tap goes through it
 * to whatever is under it.
 */
export function ChatBubble({ bubble, className }: { bubble: ShownBubble | undefined; className?: string }) {
  if (!bubble) return null;
  return (
    <span
      key={bubble.key}
      role="status"
      style={{ animationDuration: `${CHAT_BUBBLE_MS}ms` }}
      className={cn(
        "chat-pop pointer-events-none absolute top-1.5 left-full z-10 ml-3 flex h-6 origin-left items-center rounded-full bg-gold-200 font-bold whitespace-nowrap text-cosmos-950 shadow-md ring-1 ring-gold-600",
        bubble.kind === "REACTION" ? "px-1.5 text-base" : "px-2 fs-2xs",
        className,
      )}
    >
      {bubble.body}
    </span>
  );
}
