"use client";

import { cn } from "cn";

import { ABILITIES, duelArt, royalTile } from "@/components/duel/duel-art";
import { ASSETS, AssetImage, AvengersIcon } from "@/components/game/assets";
import { Card, CardView } from "@/components/game/Card";
import { tokenMeta } from "@/components/game/stone-colors";
import { getDuelCard, getRoyal } from "@/lib/duel/data";
import { STONES, TOKEN_COLORS } from "@/lib/duel/types";

/**
 * What makes a Marvel picture a Duel card: the band of its bonus color over the printed one, carrying the
 * points, the Avengers marks (its crowns), the power badge and a second stone for a double bonus; and its
 * costs in a column over the printed ones, always tall enough to cover them. Drawn inside the card's face.
 */
export function DuelCardFace({ cardId }: { cardId: string }) {
  const card = getDuelCard(cardId);
  const art = duelArt(cardId);
  const Icon = card.ability ? ABILITIES[card.ability].icon : null;
  const costs = TOKEN_COLORS.filter((t) => (card.cost[t] ?? 0) > 0);
  const rows = Math.max(costs.length, STONES.filter((s) => (art.cost[s] ?? 0) > 0).length);
  // Four costs reach up to the band, so the column tightens and the power moves to the right, under the band.
  const crowded = rows >= 4;
  const power = Icon ? (
    <span
      className={cn("flex size-[15cqw] items-center justify-center rounded-full bg-fuchsia-700 ring-1 ring-white/70", crowded && "absolute top-[40cqw] right-[5cqw]")}
      title={ABILITIES[card.ability!].label}
    >
      <Icon className="size-[9cqw] text-white" />
    </span>
  ) : null;
  return (
    <>
      <span className="absolute inset-x-0 top-0 aspect-[500/186]">
        <AssetImage src={`/assets/duel/band-${card.bonus ?? "none"}.png`} alt="" className="object-fill" />
        {/* Points on the left with the power under them, the badges in the middle of the band. */}
        <span className="absolute inset-x-[5cqw] top-[4cqw] grid grid-cols-[16cqw_1fr_16cqw] items-start text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.8)]">
          <span className="flex flex-col items-center gap-[5cqw]">
            <span className="font-display text-[length:24cqw] leading-none font-black [-webkit-text-stroke:1.5px_black] [paint-order:stroke_fill]">{card.points || ""}</span>
            {crowded ? null : power}
          </span>
          <span className="flex justify-center gap-[2cqw] pt-[4cqw]">
            {Array.from({ length: card.crowns }).map((_, i) => (
              <AvengersIcon key={i} className="size-[16cqw]" />
            ))}
          </span>
        </span>
        {card.bonusCount === 2 && card.bonus && card.bonus !== "wild" && ASSETS.tokens[card.bonus] ? (
          <span className="absolute top-[7cqw] right-[23cqw] size-[16cqw] overflow-hidden rounded-full" title="Counts as two bonuses">
            <AssetImage src={ASSETS.tokens[card.bonus]!} alt="" />
          </span>
        ) : null}
      </span>
      {crowded ? power : null}
      <span
        className={cn("absolute bottom-0 left-0 flex w-[29cqw] flex-col-reverse items-center rounded-tr-md bg-white/80 px-[3cqw] pt-[5cqw] pb-[5cqw] backdrop-blur-sm", crowded ? "gap-[3cqw]" : "gap-[4cqw]")}
        style={{ minHeight: `calc(${rows} * ${crowded ? 20 : 23}cqw + 10cqw)` }}
      >
        {costs.map((t) => (
          <span
            key={t}
            title={tokenMeta(t).label}
            className={cn(
              "flex items-center justify-center rounded-full font-black shadow-sm ring-1 ring-black/30",
              crowded ? "size-[17cqw] text-[length:10cqw]" : "size-[19cqw] text-[length:11cqw]",
              tokenMeta(t).swatch,
              tokenMeta(t).onSwatch,
            )}
          >
            {card.cost[t]}
          </span>
        ))}
      </span>
    </>
  );
}

interface DuelCardProps {
  cardId: string;
  className?: string;
  traced?: boolean;
  disabled?: boolean;
  /** The two moves a card in the pyramid or the reserve offers; left out, the card only opens to look at. */
  buy?: { onClick: () => void; disabled: boolean };
  reserve?: { onClick: () => void; disabled: boolean };
}

/** A Duel card on the table: tap for Recruit, Reserve or View, as the Marvel cards do. */
export function DuelCard({ cardId, className, traced, disabled, buy, reserve }: DuelCardProps) {
  return (
    <Card
      card={duelArt(cardId)}
      className={className}
      traced={traced}
      disabled={disabled}
      overlay={<DuelCardFace cardId={cardId} />}
      recruitAction={buy ? { label: "Recruit", ...buy } : undefined}
      reserveAction={reserve ? { label: "Reserve", ...reserve } : undefined}
    />
  );
}

/** A Duel card to look at, not to act on. */
export function DuelCardView({ cardId, className, style }: { cardId: string; className?: string; style?: React.CSSProperties }) {
  return <CardView card={duelArt(cardId)} className={className} style={style} overlay={<DuelCardFace cardId={cardId} />} />;
}

/** A Royal card, a Location to the player: its tile with a panel over the printed left bar carrying the points and power. */
export function RoyalCard({ royalId, taken, selectable, onClick, className }: { royalId: string; taken?: boolean; selectable?: boolean; onClick?: () => void; className?: string }) {
  const royal = getRoyal(royalId);
  const tile = royalTile(royalId);
  const Icon = royal.ability ? ABILITIES[royal.ability].icon : null;
  const face = (
    <>
      <AssetImage src={tile.image} alt={tile.name} />
      <span className="absolute inset-y-0 left-0 flex w-[30cqw] flex-col items-center justify-between bg-cosmos-950 py-[6cqw]">
        <span className="font-display text-[length:22cqw] leading-none font-black text-white [-webkit-text-stroke:2px_black] [paint-order:stroke_fill]">{royal.points}</span>
        {/* The counts that earn one: the first at 3 badges, the second at 6. */}
        <span className="flex flex-col gap-[2cqw] text-[length:8cqw] leading-none font-black text-white">
          {[3, 6].map((n) => (
            <span key={n} className="flex items-center gap-[1.5cqw]">
              <AvengersIcon className="size-[10cqw]" />
              {n}×
            </span>
          ))}
        </span>
        {Icon ? (
          <span className="flex size-[18cqw] items-center justify-center rounded-full bg-fuchsia-700 ring-1 ring-white/70">
            <Icon className="size-[11cqw] text-white" />
          </span>
        ) : (
          <span className="size-[18cqw]" />
        )}
      </span>
    </>
  );
  const shell = cn("@container relative block aspect-square w-12 shrink-0 overflow-hidden rounded-tile ring-1 ring-gold-400/60", taken && "opacity-30", selectable && "ring-2 ring-primary hover:brightness-110", className);
  const title = `${tile.name}: ${royal.points} points${royal.ability ? `, ${ABILITIES[royal.ability].label}` : ", points only"}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(shell, "hover:ring-2 hover:ring-gold-400")} title={title}>
      {face}
    </button>
  ) : (
    <span className={shell} title={title}>
      {face}
    </span>
  );
}
