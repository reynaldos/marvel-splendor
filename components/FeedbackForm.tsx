"use client";

import { useState, useTransition } from "react";
import { Bug, UserRoundPlus, Wrench } from "lucide-react";
import { toast } from "sonner";

import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FEEDBACK_KIND_LABEL, FEEDBACK_MAX } from "@/lib/feedback";
import type { FeedbackKind } from "@/lib/generated/prisma/enums";
import { submitFeedbackAction } from "@/app/feedback/actions";

const TITLE = "font-display text-base font-black tracking-widest text-gold-400 uppercase";
const CHOICE =
  "group flex w-24 flex-col items-center gap-1.5 text-center text-xs leading-tight font-bold tracking-wide uppercase outline-none [&>span]:focus-visible:ring-gold-400";
const CHOICE_ICON =
  "flex size-14 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset group-hover:bg-cosmos-500";
const WIDE = "flex h-12 flex-1 items-center justify-center rounded-full text-base font-bold outline-none focus-visible:ring-2 focus-visible:ring-gold-400";

/** The menu's Feedback view: pick a feature request or a bug report, then write it. Goes inside a DialogContent. */
export function FeedbackForm({ onSent }: { onSent: () => void }) {
  const [kind, setKind] = useState<FeedbackKind | null>(null);
  const [body, setBody] = useState("");
  const [sending, start] = useTransition();

  if (kind === null) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className={TITLE}>Feedback</DialogTitle>
          <DialogDescription className="sr-only">Ask for something, or tell us what went wrong.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-4">
          <button type="button" onClick={() => setKind("FEATURE")} className={CHOICE}>
            <span className={CHOICE_ICON}>
              <Wrench className="size-7" />
            </span>
            Feature
            <br />
            request
          </button>
          <button type="button" onClick={() => setKind("BUG")} className={CHOICE}>
            <span className={CHOICE_ICON}>
              <Bug className="size-7" />
            </span>
            Bug
            <br />
            report
          </button>
          <button type="button" onClick={() => setKind("CHARACTER")} className={CHOICE}>
            <span className={CHOICE_ICON}>
              <UserRoundPlus className="size-7" />
            </span>
            Character
            <br />
            request
          </button>
        </div>
      </>
    );
  }

  const send = () =>
    start(async () => {
      const result = await submitFeedbackAction(kind, body);
      if (!result.ok) return void toast.error(result.message);
      toast.success(result.message);
      onSent();
    });

  return (
    <>
      <DialogHeader>
        <DialogTitle className={TITLE}>{FEEDBACK_KIND_LABEL[kind]}</DialogTitle>
        <DialogDescription className="sr-only">Write it below and send it.</DialogDescription>
      </DialogHeader>
      <label className="relative flex">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={FEEDBACK_MAX}
          autoFocus
          placeholder="Please share your feedback"
          aria-label={FEEDBACK_KIND_LABEL[kind]}
          className="h-40 w-full resize-none rounded-2xl bg-cosmos-950 p-4 pb-8 text-base ring-2 ring-cosmos-500 ring-inset outline-none placeholder:text-cosmos-500 focus-visible:ring-gold-400"
        />
        <span className="pointer-events-none absolute right-4 bottom-3 text-xs font-bold text-cosmos-300 tabular-nums">
          {body.length}/{FEEDBACK_MAX}
        </span>
      </label>
      <div className="flex gap-3">
        <button type="button" onClick={() => setKind(null)} className={`${WIDE} bg-marvel text-white hover:bg-red-500`}>
          Cancel
        </button>
        <button
          type="button"
          onClick={send}
          disabled={sending || body.trim() === ""}
          className={`${WIDE} bg-gold-400 text-cosmos-950 hover:bg-gold-200 disabled:bg-cosmos-700 disabled:text-cosmos-300`}
        >
          {sending ? "Sending…" : "Submit"}
        </button>
      </div>
    </>
  );
}
