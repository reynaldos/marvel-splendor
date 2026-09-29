"use client";

import { Smile } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EMOJIS, MESSAGES, type ChatSend } from "@/lib/chat";

interface ChatButtonProps {
  /** Just sent: the button is off until the player may send again. */
  waiting: boolean;
  onSend: (chat: ChatSend) => void;
  /** Starts with the list showing, to look at it on the preview board. */
  defaultOpen?: boolean;
}

/** The button beside the player's own name: it opens the emojis and set messages, and one tap sends. */
export function ChatButton({ waiting, onSend, defaultOpen }: ChatButtonProps) {
  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Send an emoji or a message"
          disabled={waiting}
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-1 ring-cosmos-500 ring-inset hover:bg-cosmos-500 disabled:opacity-40 disabled:hover:bg-cosmos-700"
        >
          <Smile className="size-4" />
        </button>
      </DropdownMenuTrigger>
      {/* Drawn outside the board, so it names the theme again and sets its own width. */}
      <DropdownMenuContent side="top" align="start" className="theme-cosmos dark w-88 border-2 border-gold-400">
        <div className="grid grid-cols-8">
          {EMOJIS.map((body) => (
            <DropdownMenuItem
              key={body}
              aria-label={`Send ${body}`}
              className="h-9 justify-center p-0 text-xl"
              onSelect={() => onSend({ kind: "REACTION", body })}
            >
              {body}
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <div className="grid grid-cols-2">
          {MESSAGES.map((body) => (
            <DropdownMenuItem key={body} className="text-sm whitespace-nowrap" onSelect={() => onSend({ kind: "TEXT", body })}>
              {body}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
