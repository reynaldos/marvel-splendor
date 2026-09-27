"use client";

import { useState } from "react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { ASSETS, AssetImage, AvengersIcon } from "@/components/game/assets";
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
  /** Visual hint only — highlights the card as currently affordable. */
  affordable?: boolean;
  /** Highlights the card as the one currently staged for an action. */
  selected?: boolean;
  disabled?: boolean;
  reserveAction?: CardActionProps;
  recruitAction?: CardActionProps;
  /** Pass a width (`w-*`) to resize; the height follows and the face scales with it. */
  className?: string;
}

/**
 * A single character card — the atomic visual for CardMarket and
 * ReserveTray. Tap/click lifts the card over a dimmed board and shows the
 * currently-legal Recruit/Reserve actions beside it, plus View, which opens
 * the card large in the middle of the screen; tapping anywhere else
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
  affordable,
  selected,
  disabled,
  reserveAction,
  recruitAction,
  className,
}: CardProps) {
  const [expanded, setExpanded] = useState(false);
  const [viewing, setViewing] = useState(false);
  const showBack = faceDown || !card;

  if (showBack) {
    return (
      <div
        className={cn(
          "flex aspect-card w-16 shrink-0 items-center justify-center rounded-md bg-muted ring-1 ring-foreground/10",
          className,
        )}
        aria-label="Face-down card"
      >
        <div className="aspect-square w-1/2 rounded-full bg-foreground/10" />
      </div>
    );
  }

  // `disabled` (not your turn, or busy) only takes away the moves; any
  // face-up card can still be opened to look at.
  const showRecruit = !disabled && recruitAction && !recruitAction.disabled;
  const showReserve = !disabled && reserveAction && !reserveAction.disabled;
  const close = () => {
    setExpanded(false);
    setViewing(false);
  };

  return (
    <div
      className={cn("relative aspect-card w-16 shrink-0", expanded && "z-50", className)}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      {expanded ? (
        <button
          type="button"
          aria-label="Close card actions"
          className="fixed inset-0 cursor-default bg-black/60 backdrop-blur-xs"
          onClick={close}
        />
      ) : null}

      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "@container relative block size-full overflow-hidden rounded-md bg-zinc-900 text-left ring-1 ring-foreground/10 transition-transform disabled:cursor-default",
          affordable && "ring-2 ring-primary",
          selected && "ring-2 ring-offset-2 ring-offset-background outline outline-primary",
          expanded && "scale-110",
        )}
      >
        <CardArt card={card} />
      </button>

      {expanded && !viewing ? (
        <div className="absolute top-1/2 left-full ml-3 flex -translate-y-1/2 flex-col gap-1.5">
          {showRecruit ? (
            <Button
              type="button"
              size="lg"
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
              size="lg"
              variant="secondary"
              onClick={() => {
                reserveAction.onClick();
                setExpanded(false);
              }}
            >
              {reserveAction.label}
            </Button>
          ) : null}
          <Button type="button" size="lg" variant="secondary" onClick={() => setViewing(true)}>
            View
          </Button>
        </div>
      ) : null}

      {viewing ? (
        <button
          type="button"
          autoFocus
          aria-label={`Close ${card.name}`}
          onClick={close}
          className="fixed inset-0 flex cursor-default items-center justify-center bg-black/75 outline-none backdrop-blur-xs"
        >
          <CardView card={card} className="w-61 rounded-xl" />
        </button>
      ) : null}
    </div>
  );
}

/** Display-only card, safe to nest inside another button (fan, overlays). */
export function CardView({
  card,
  className,
  style,
}: {
  card: CardType;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={style}
      className={cn(
        "@container relative block aspect-card w-16 shrink-0 overflow-hidden rounded-md bg-zinc-900 text-left ring-1 ring-foreground/10",
        className,
      )}
    >
      <CardArt card={card} />
    </span>
  );
}

function CardArt({ card }: { card: CardType }) {
  return card.image ? (
    <AssetImage src={card.image} alt={card.name} />
  ) : (
    <CardFace card={card} />
  );
}

const BADGE = "size-[21cqw] text-[length:14cqw]";

/** Image-less placeholder face, structured like the physical card. Sized in
 * `cqw` (percent of the card's width) so it holds up at any card size. */
function CardFace({ card }: { card: CardType }) {
  const meta = STONE_COLORS[card.bonus];
  const bonusArt = ASSETS.tokens[card.bonus];

  return (
    <>
      <span className={cn("absolute inset-0 opacity-25", meta.swatch)} />

      <span className={cn("absolute inset-x-0 top-0 flex h-[34cqw] items-center gap-[3cqw] px-[5cqw]", meta.swatch)}>
        <span className="min-w-[16cqw] text-[length:28cqw] leading-none font-black text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.8)]">
          {card.points > 0 ? card.points : null}
        </span>
        {Array.from({ length: card.tags }).map((_, i) => (
          <AvengersIcon key={i} className={BADGE} />
        ))}
        <span
          title={`${meta.label} bonus`}
          className={cn(
            "relative ml-auto overflow-hidden rounded-full bg-zinc-900 ring-2 ring-inset",
            meta.ring,
            BADGE,
          )}
        >
          {bonusArt ? <AssetImage src={bonusArt} alt="" /> : null}
        </span>
      </span>

      {/* Rulebook: every Level 3 card bears the Time Stone. */}
      {card.level === 3 ? (
        <span
          title="Time Stone"
          className="absolute top-[38cqw] right-[5cqw] size-[16cqw] rounded-full bg-green-500 ring-1 ring-white"
        />
      ) : null}

      <span className="absolute bottom-0 left-0 flex flex-col gap-[2cqw] rounded-tr-md bg-white/30 p-[3cqw]">
        {STONES.filter((s) => (card.cost[s] ?? 0) > 0).map((s) => (
          <span
            key={s}
            title={STONE_COLORS[s].label}
            className={cn(
              "flex items-center justify-center rounded-full font-bold ring-1 ring-black/30",
              BADGE,
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
          "absolute right-0 bottom-0 left-[27cqw] line-clamp-2 px-[4cqw] py-[2cqw] text-center text-[length:9.5cqw] leading-tight font-bold uppercase",
          meta.swatch,
          meta.onSwatch,
        )}
      >
        {card.name}
      </span>
    </>
  );
}
