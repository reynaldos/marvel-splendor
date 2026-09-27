"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { STONE_COLORS } from "@/components/game/stone-colors";
import { STONES, type Card as CardType } from "@/lib/engine/types";

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
 *
 * A card with an `image` renders that image full-bleed (the art carries its
 * own points/cost/name). Without one it draws a placeholder laid out like
 * the physical card: bonus-colored top band (points left, bonus stone
 * right), costs stacked bottom-left, name banner bottom-right.
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
          "relative block size-full overflow-hidden rounded-md bg-zinc-900 text-left ring-1 ring-foreground/10 transition-transform disabled:cursor-default",
          affordable && "ring-2 ring-primary",
          selected && "ring-2 ring-offset-2 ring-offset-background outline outline-primary",
          expanded && "scale-105",
        )}
      >
        {card.image ? (
          <Image src={card.image} alt={card.name} fill sizes="12rem" className="object-cover" draggable={false} />
        ) : (
          <CardFace card={card} small={size === "sm"} />
        )}
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

/** Image-less placeholder face, structured like the physical card. */
function CardFace({ card, small }: { card: CardType; small: boolean }) {
  const meta = STONE_COLORS[card.bonus];
  const badge = small ? "size-3.5 text-[0.55rem]" : "size-5 text-xs";

  return (
    <>
      <span className={cn("absolute inset-0 opacity-25", meta.swatch)} />

      <span
        className={cn(
          "absolute inset-x-0 top-0 flex items-center gap-0.5 px-1",
          small ? "h-5" : "h-8",
          meta.swatch,
        )}
      >
        <span
          className={cn(
            "font-black text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.8)]",
            small ? "min-w-2.5 text-sm" : "min-w-4 text-2xl",
          )}
        >
          {card.points > 0 ? card.points : null}
        </span>
        {Array.from({ length: card.tags }).map((_, i) => (
          <span
            key={i}
            title="Avengers tag"
            className={cn(
              "flex items-center justify-center rounded-full bg-white font-black text-red-600 ring-1 ring-black/30",
              badge,
            )}
          >
            A
          </span>
        ))}
        <span
          title={`${meta.label} bonus`}
          className={cn("ml-auto rounded-full bg-zinc-900 ring-2 ring-inset", meta.ring, badge)}
        />
      </span>

      {/* Rulebook: every Level 3 card bears the Time Stone. */}
      {card.level === 3 ? (
        <span
          title="Time Stone"
          className={cn(
            "absolute right-1 rounded-full bg-green-500 ring-1 ring-white",
            small ? "top-6 size-2.5" : "top-9 size-4",
          )}
        />
      ) : null}

      <span className="absolute bottom-0 left-0 flex flex-col gap-0.5 rounded-tr-md bg-white/30 p-0.5">
        {STONES.filter((s) => (card.cost[s] ?? 0) > 0).map((s) => (
          <span
            key={s}
            title={STONE_COLORS[s].label}
            className={cn(
              "flex items-center justify-center rounded-full font-bold ring-1 ring-black/30",
              badge,
              STONE_COLORS[s].swatch,
              STONE_COLORS[s].onSwatch,
            )}
          >
            {card.cost[s]}
          </span>
        ))}
      </span>

      <span
        className={cn(
          "absolute right-0 bottom-0 line-clamp-2 px-1 py-0.5 text-center leading-tight font-bold uppercase",
          small ? "left-[1.125rem] text-[0.4rem]" : "left-6 text-[0.55rem]",
          meta.swatch,
          meta.onSwatch,
        )}
      >
        {card.name}
      </span>
    </>
  );
}
