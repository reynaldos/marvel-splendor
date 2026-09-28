"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** The join code, with a button that copies the link to send to friends. */
export function ShareCode({ code, url }: { code: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-3">
      <span className="font-display text-sm font-bold tracking-wide text-gold-400 uppercase">Room code</span>
      <span className="font-mono text-3xl leading-none font-black tracking-[0.15em] select-all">{code}</span>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Link copied" : "Copy invite link"}
        className="flex size-10 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500"
      >
        {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
      </button>
    </div>
  );
}
