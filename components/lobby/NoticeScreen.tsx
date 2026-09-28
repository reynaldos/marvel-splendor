import type { ReactNode } from "react";

import { Logo } from "@/components/home/Logo";
import { Stage } from "@/components/Stage";

/** A framed message with one thing to do next: an invite, or why a room couldn't be joined. */
export function NoticeScreen({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  /** The button or link. */
  children: ReactNode;
}) {
  return (
    <Stage className="justify-center">
      <div className="frame-gold flex w-120 flex-col items-center gap-4 rounded-3xl px-10 py-8 text-center">
        <Logo className="text-4xl" />
        <h1 className="font-display text-xl font-black tracking-wide text-gold-400 uppercase">{title}</h1>
        <p className="text-sm text-cosmos-300">{message}</p>
        {children}
      </div>
    </Stage>
  );
}

export const NOTICE_BUTTON =
  "flex h-12 items-center rounded-full bg-marvel px-10 font-display text-base font-black tracking-wide text-white uppercase hover:bg-red-500";
