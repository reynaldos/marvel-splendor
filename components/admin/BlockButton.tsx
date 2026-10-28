"use client";

import { useTransition } from "react";
import { cn } from "cn";

import { setBlockedAction } from "@/app/admin/actions";

/** Blocks an account on a tap, or lets it back in; a blocked account is signed out wherever it turns up. */
export function BlockButton({ userId, blocked, self }: { userId: string; blocked: boolean; self: boolean }) {
  const [pending, start] = useTransition();
  if (self) return null;
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => setBlockedAction(userId, !blocked))}
      className={cn(
        "h-7 rounded-full px-3 text-xs font-black tracking-wide uppercase disabled:opacity-40",
        blocked ? "bg-cosmos-700 ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500" : "bg-marvel text-white hover:bg-red-500",
      )}
    >
      {pending ? "…" : blocked ? "Unblock" : "Block"}
    </button>
  );
}
