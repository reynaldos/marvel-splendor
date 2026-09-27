interface BanterBubbleProps {
  seat: number;
  text: string | null;
}

/**
 * Stub only (ARCHITECTURE.md Phase 1 item 7 is deferred): renders a small
 * speech bubble near a plaque when `text` is non-empty, and nothing
 * otherwise. A later task wires real OpenAI-generated content into
 * `GameBoardClient`'s `banterBySeat` state, which is the only thing that
 * ever populates `text`.
 */
export function BanterBubble({ text }: BanterBubbleProps) {
  if (!text) return null;
  return (
    <div className="absolute -top-3 left-1/2 z-10 max-w-40 -translate-x-1/2 -translate-y-full rounded-lg bg-popover px-2 py-1 fs-2xs text-popover-foreground shadow-md ring-1 ring-foreground/10">
      {text}
      <span className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rotate-45 bg-popover ring-1 ring-foreground/10" />
    </div>
  );
}
