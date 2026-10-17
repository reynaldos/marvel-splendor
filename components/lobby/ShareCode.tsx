"use client";

import { useState } from "react";
import { Check, Copy, Share } from "lucide-react";

const BUTTON =
  "flex size-12 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500";

/**
 * What gets sent to a friend: a line to read, the code, and a link that joins
 * in one tap. The link goes inside the text: given separately, many apps send
 * the link alone and drop the message.
 */
export function inviteText(code: string, origin: string) {
  return {
    title: "Marvel Splendor",
    text: `Join my Marvel Splendor game! Room code: ${code}\n${origin}/join/${code}`,
  };
}

/** The room code, with buttons to copy it or send an invite. */
export function ShareCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    const invite = inviteText(code, window.location.origin);
    // Browsers without a share sheet get the whole invite copied instead.
    if (!navigator.share) return copy(invite.text);
    // Closing the sheet without sending rejects; that isn't an error.
    await navigator.share(invite).catch(() => {});
  }

  return (
    <div className="flex items-center gap-3">
      <span className="font-display text-sm font-bold tracking-wide text-gold-400 uppercase">Room code</span>
      <span className="font-mono text-3xl leading-none font-black tracking-[0.15em] select-all">{code}</span>
      <button
        type="button"
        onClick={() => copy(code)}
        aria-label={copied ? "Copied" : "Copy room code"}
        className={BUTTON}
      >
        {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
      </button>
      <button type="button" onClick={share} aria-label="Share invite" className={BUTTON}>
        <Share className="size-5" />
      </button>
    </div>
  );
}
