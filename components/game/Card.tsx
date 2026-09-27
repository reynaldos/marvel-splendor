"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "cn";
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
  className?: string;
}

/**
 * A single character card — the atomic visual for CardMarket and
 * ReserveTray. Tap/click lifts the card over a dimmed board and shows the
 * currently-legal Recruit/Reserve actions beside it; tapping anywhere else
 * dismisses. All input is tap-only — there is no drag interaction.
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
  className,
}: CardProps) {
  const [expanded, setExpanded] = useState(false);
  const showBack = faceDown || !card;
  const hasActions = Boolean(reserveAction || recruitAction);

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
  const showRecruit = recruitAction && !recruitAction.disabled;
  const showReserve = reserveAction && !reserveAction.disabled;

  return (
    <div
      className={cn("relative shrink-0", dims, expanded && "z-50", className)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setExpanded(false);
      }}
    >
      {expanded ? (
        <button
          type="button"
          aria-label="Close card actions"
          className="fixed inset-0 cursor-default bg-black/60"
          onClick={() => setExpanded(false)}
        />
      ) : null}

      <button
        type="button"
        disabled={disabled || !hasActions}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "relative flex size-full flex-col overflow-hidden rounded-md bg-card text-left ring-1 ring-foreground/10 transition-transform disabled:cursor-default",
          affordable && "ring-2 ring-primary",
          selected && "ring-2 ring-offset-2 ring-offset-background outline outline-primary",
          expanded && "scale-105",
        )}
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
        <div className="flex w-full flex-1 flex-col gap-0.5 p-1">
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

      {expanded && (showRecruit || showReserve) ? (
        <div className="absolute top-1/2 left-full ml-3 flex -translate-y-1/2 flex-col gap-1.5">
          {showRecruit ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                recruitAction.onClick();
                setExpanded(false);
              }}
            >
              {recruitAction.label}
            </Button>
          ) : null}
          {showReserve ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                reserveAction.onClick();
                setExpanded(false);
              }}
            >
              {reserveAction.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
