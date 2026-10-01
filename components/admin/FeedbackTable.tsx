"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { cn } from "cn";
import { ArrowDown, ArrowUp } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FEEDBACK_KIND_LABEL, FEEDBACK_STATUS_LABEL, FEEDBACK_STATUSES, type FeedbackRow } from "@/lib/feedback";
import { timeAgo } from "@/lib/game-record";
import type { FeedbackStatus } from "@/lib/generated/prisma/enums";
import { setFeedbackNoteAction, setFeedbackStatusAction } from "@/app/admin/actions";

type Column = { key: keyof FeedbackRow; label: string };

const COLUMNS: Column[] = [
  { key: "status", label: "Status" },
  { key: "kind", label: "Kind" },
  { key: "username", label: "From" },
  { key: "body", label: "Message" },
  { key: "createdAt", label: "Submitted" },
  { key: "updatedAt", label: "Last updated" },
];

const STATUS_DOT: Record<FeedbackStatus, string> = {
  NEW: "bg-gold-400",
  ROADMAP: "bg-sky-300",
  IN_PROGRESS: "bg-violet-300",
  COMPLETED: "bg-emerald-400",
};

function Status({ status }: { status: FeedbackStatus }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className={cn("size-2 rounded-full", STATUS_DOT[status])} />
      {FEEDBACK_STATUS_LABEL[status]}
    </span>
  );
}

/** What players sent, sortable by any column, each row opening to the whole message and its status. */
export function FeedbackTable({ rows }: { rows: FeedbackRow[] }) {
  const [sort, setSort] = useState<{ key: keyof FeedbackRow; desc: boolean }>({ key: "updatedAt", desc: true });
  const [openId, setOpenId] = useState<string | null>(null);
  // What is typed in the note box; null means it still reads what is saved.
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, start] = useTransition();

  const sorted = [...rows].sort((a, b) => {
    const [x, y] = [a[sort.key], b[sort.key]];
    const order = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
    return sort.desc ? -order : order;
  });
  const open = rows.find((row) => row.id === openId);
  const note = draft ?? open?.note ?? "";

  const sortBy = (key: keyof FeedbackRow) =>
    setSort((prev) => ({ key, desc: prev.key === key ? !prev.desc : key === "createdAt" || key === "updatedAt" }));

  if (rows.length === 0) return <p className="text-sm font-bold text-cosmos-300">Nothing has been sent yet.</p>;

  return (
    <>
      <div className="overflow-x-auto rounded-xl bg-cosmos-900 ring-2 ring-cosmos-500 ring-inset">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="text-xs text-cosmos-300">
            <tr>
              {COLUMNS.map(({ key, label }) => (
                <th key={key} scope="col" aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : "none"}>
                  <button
                    type="button"
                    onClick={() => sortBy(key)}
                    className="flex items-center gap-1 px-4 py-3 font-bold hover:text-white"
                  >
                    {label}
                    {sort.key === key ? sort.desc ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" /> : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular-nums [&_td]:px-4 [&_td]:py-2.5 [&_tr]:border-t [&_tr]:border-cosmos-700">
            {sorted.map((row) => (
              <tr
                key={row.id}
                onClick={() => {
                  setDraft(null);
                  setOpenId(row.id);
                }}
                className={cn("cursor-pointer hover:bg-cosmos-800", row.status === "NEW" && "font-bold text-white")}
              >
                <td>
                  <Status status={row.status} />
                </td>
                <td>{FEEDBACK_KIND_LABEL[row.kind]}</td>
                <td>{row.username}</td>
                <td className="max-w-md truncate">{row.body}</td>
                <td>{timeAgo(row.createdAt)}</td>
                <td>{timeAgo(row.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open !== undefined} onOpenChange={(next) => !next && setOpenId(null)}>
        <DialogContent className="theme-cosmos dark gap-4 border-2 border-gold-400 sm:max-w-lg">
          {open ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-base font-black tracking-widest text-gold-400 uppercase">
                  {FEEDBACK_KIND_LABEL[open.kind]}
                </DialogTitle>
                <DialogDescription className="text-sm text-white/70">
                  From{" "}
                  <Link href={`/profile/${open.username}`} className="font-bold text-gold-200 hover:underline">
                    {open.username}
                  </Link>
                  , {timeAgo(open.createdAt)}. Last updated {timeAgo(open.updatedAt)}.
                </DialogDescription>
              </DialogHeader>
              <p className="max-h-60 overflow-y-auto rounded-2xl bg-cosmos-950 p-4 text-sm whitespace-pre-wrap ring-2 ring-cosmos-500 ring-inset">
                {open.body}
              </p>
              <label className="flex flex-col gap-1 text-xs font-bold text-cosmos-300">
                Note
                <textarea
                  value={note}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Anything to remember about this one"
                  className="h-24 resize-none rounded-2xl bg-cosmos-950 p-3 text-sm font-normal text-white ring-2 ring-cosmos-500 ring-inset outline-none placeholder:text-cosmos-500 focus-visible:ring-gold-400"
                />
              </label>
              <button
                type="button"
                disabled={saving || note.trim() === (open.note ?? "")}
                onClick={() =>
                  start(async () => {
                    await setFeedbackNoteAction(open.id, note);
                    setDraft(null);
                  })
                }
                className="flex h-10 items-center justify-center rounded-full bg-gold-400 text-xs font-bold text-cosmos-950 hover:bg-gold-200 disabled:bg-cosmos-700 disabled:text-cosmos-300"
              >
                Save note
              </button>
              <div role="radiogroup" aria-label="Status" className="grid grid-cols-4 gap-2">
                {FEEDBACK_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    role="radio"
                    aria-checked={open.status === status}
                    disabled={saving}
                    onClick={() => start(() => setFeedbackStatusAction(open.id, status))}
                    className={cn(
                      "flex h-10 items-center justify-center gap-2 rounded-full text-xs font-bold ring-2 ring-inset",
                      open.status === status ? "bg-gold-400 text-cosmos-950 ring-gold-400" : "bg-cosmos-700 ring-cosmos-500 hover:bg-cosmos-500",
                    )}
                  >
                    <span aria-hidden className={cn("size-2 rounded-full", STATUS_DOT[status])} />
                    {FEEDBACK_STATUS_LABEL[status]}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
