"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "cn";
import { useDraggable } from "@dnd-kit/core";
import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { cardArtUrl, STONE_COLORS } from "@/components/game/stone-colors";
import { STONES, type Card as CardType } from "@/lib/engine/types";

const LEVEL_LABEL = { 1: "I", 2: "II", 3: "III" } as const;

interface CardActionProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface CardProps {
  /** Omit (or pass `faceDown`) to render a card-back placeholder — used for
   * opponents' blind reservations and unrevealed deck slots, where the
   * viewer genuinely doesn't know the card's identity. */
  card?: CardType;
  faceDown?: boolean;
  size?: "sm" | "default";
  /** Visual hint only — highlights the card as currently affordable. */
  affordable?: boolean;
  /** Highlights the card as the one currently staged for an action. */
  selected?: boolean;
  disabled?: boolean;
  reserveAction?: CardActionProps;
  recruitAction?: CardActionProps;
  /** dnd-kit drag source id; omit to make the card non-draggable. */
  dragId?: string;
  dragData?: Record<string, unknown>;
  className?: string;
}

/**
 * A single character card — the atomic visual for CardMarket and
 * ReserveTray. Tap/click toggles a reveal of the Reserve/Recruit action
 * buttons (mobile-friendly equivalent of drag-and-drop), per ARCHITECTURE.md
 * §6's accessibility note: no drag-only interactions.
 */
export function Card({
  card,
  faceDown,
  size = "default",
  affordable,
  selected,
  disabled,
  reserveAction,
  recruitAction,
  dragId,
  dragData,
  className,
}: CardProps) {
  const [expanded, setExpanded] = useState(false);
  const showBack = faceDown || !card;
  const hasActions = Boolean(reserveAction || recruitAction);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId ?? `card-disabled-${card?.id ?? "back"}`,
    data: dragData,
    disabled: !dragId || disabled || showBack,
  });

  const dims = size === "sm" ? "h-24 w-16" : "h-36 w-24";

  if (showBack) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md bg-muted ring-1 ring-foreground/10",
          dims,
          className,
        )}
        aria-label="Face-down card"
      >
        <div className="size-8 rounded-full bg-foreground/10" />
      </div>
    );
  }

  const meta = STONE_COLORS[card.bonus];

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
          : undefined
      }
      className={cn(
        "group relative flex shrink-0 flex-col overflow-hidden rounded-md bg-card text-left ring-1 ring-foreground/10 transition-shadow",
        dims,
        affordable && "ring-2 ring-primary",
        selected && "ring-2 ring-offset-2 ring-offset-background outline outline-primary",
        isDragging && "opacity-50",
        dragId && !disabled && "cursor-grab active:cursor-grabbing",
        className,
      )}
    >
      <button
        type="button"
        disabled={disabled || !hasActions}
        onClick={() => setExpanded((v) => !v)}
        className="flex flex-1 flex-col disabled:cursor-default"
      >
        <Image
          src={cardArtUrl(card.id, card.bonus, size === "sm" ? "96x64" : "160x104")}
          alt={card.id}
          width={size === "sm" ? 96 : 160}
          height={size === "sm" ? 64 : 104}
          unoptimized
          className={cn("w-full object-cover", size === "sm" ? "h-10" : "h-16")}
          draggable={false}
        />
        <div className="flex flex-1 flex-col gap-0.5 p-1">
          <div className="flex items-center justify-between">
            <span className="rounded bg-foreground/10 px-1 text-[0.6rem] font-semibold">
              {LEVEL_LABEL[card.level]}
            </span>
            <span className={cn("size-3 rounded-full", meta.swatch)} title={`${meta.label} bonus`} />
            {card.points > 0 ? (
              <span className="text-[0.65rem] font-bold">{card.points}</span>
            ) : null}
          </div>
          {card.tags > 0 ? (
            <div className="flex gap-0.5">
              {Array.from({ length: card.tags }).map((_, i) => (
                <HugeiconsIcon key={i} icon={Shield01Icon} strokeWidth={2} className="size-2.5 text-muted-foreground" />
              ))}
            </div>
          ) : null}
          <div className="mt-auto flex flex-wrap gap-0.5">
            {STONES.filter((s) => (card.cost[s] ?? 0) > 0).map((s) => (
              <span
                key={s}
                className={cn(
                  "flex size-3.5 items-center justify-center rounded-full text-[0.55rem] font-semibold",
                  STONE_COLORS[s].swatch,
                  STONE_COLORS[s].onSwatch,
                )}
              >
                {card.cost[s]}
              </span>
            ))}
          </div>
        </div>
      </button>

      {hasActions && expanded ? (
        <div className="absolute inset-0 flex flex-col items-stretch justify-center gap-1 bg-background/95 p-1.5">
          {reserveAction ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={disabled || reserveAction.disabled}
              onClick={() => {
                reserveAction.onClick();
                setExpanded(false);
              }}
            >
              {reserveAction.label}
            </Button>
          ) : null}
          {recruitAction ? (
            <Button
              type="button"
              size="sm"
              disabled={disabled || recruitAction.disabled}
              onClick={() => {
                recruitAction.onClick();
                setExpanded(false);
              }}
            >
              {recruitAction.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
