"use client";

import { useEffect, useState, type ComponentType } from "react";
import { Check, Coins, Image as Picture, Layers, MapPin, Music, Palette } from "lucide-react";
import { cn } from "cn";
import { toast } from "sonner";

import { BackLink } from "@/components/BackLink";
import { AssetImage, hasAsset } from "@/components/game/AssetImage";
import { markSeen } from "@/components/seen";
import { PackOpening } from "@/components/shop/PackOpening";
import { Stage } from "@/components/Stage";
import { PACK_BY_ID } from "@/lib/engine/data";
import type { Pack } from "@/lib/engine/types";
import type { PurchaseResult } from "@/lib/record-purchase";
import { PACK_KINDS, SHOP_ITEMS, SHOP_KINDS, SHOP_LATEST, SHOP_SEEN_KEY, type ShopItem, type ShopKind } from "@/lib/shop";

const SHELVES: Record<ShopKind, { label: string; icon: ComponentType<{ className?: string }> }> = {
  pack: { label: "Card packs", icon: Layers },
  background: { label: "Backgrounds", icon: Picture },
  music: { label: "Music", icon: Music },
  tile: { label: "Locations", icon: MapPin },
  theme: { label: "Themes", icon: Palette },
};

const TILE = "relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl p-3 text-center ring-2 ring-inset";
const UNLIT = "bg-cosmos-950 ring-cosmos-500 hover:bg-cosmos-700";
const LIT = "bg-cosmos-700 ring-gold-400 shadow-[0_0_16px] shadow-gold-400/40";
const HEADING = "font-display text-xs font-black tracking-widest text-gold-400 uppercase";
const PRICE = "flex h-7 items-center gap-1 rounded-full bg-cosmos-950 px-3 text-sm font-black tabular-nums ring-2 ring-cosmos-500 ring-inset";

interface ShopScreenProps {
  coins: number;
  /** What the player already has, as "kind:id". */
  owned: string[];
  onPurchase: (kind: string, itemId: string) => Promise<PurchaseResult>;
}

/** The item's picture, or a stand-in until its file is in the repo. */
function Cover({ item, className }: { item: ShopItem; className?: string }) {
  return (
    <span className={cn("relative block aspect-square overflow-hidden rounded-xl", className)}>
      {hasAsset(item.cover) ? (
        <AssetImage src={item.cover} alt="" className="object-contain" />
      ) : (
        <span className="flex size-full items-center justify-center rounded-[inherit] bg-linear-to-b from-cosmos-700 to-cosmos-950 ring-2 ring-gold-400 ring-inset">
          <Layers className="size-1/2 text-gold-400" />
        </span>
      )}
    </span>
  );
}

/** How many cards or tiles a pack holds; which ones stays a surprise until it is opened. */
function contents(item: ShopItem): string | null {
  const pack = PACK_KINDS.includes(item.kind) ? PACK_BY_ID.get(item.id) : undefined;
  if (!pack) return null;
  const tiles = pack.locations?.length ?? 0;
  return tiles ? `${tiles} locations` : `${pack.cards.length} cards`;
}

/**
 * The shop: shelves down the left, what is on the chosen shelf in the middle,
 * and the chosen item on the right with its price and the button to buy it.
 */
export function ShopScreen({ coins: startingCoins, owned: startingOwned, onPurchase }: ShopScreenProps) {
  const [shelf, setShelf] = useState<ShopKind>("pack");
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [coins, setCoins] = useState(startingCoins);
  const [owned, setOwned] = useState(startingOwned);
  const [buying, setBuying] = useState(false);
  const [opening, setOpening] = useState<Pack | null>(null);
  // A visit takes the dot off the home screen's Shop button.
  useEffect(() => markSeen(SHOP_SEEN_KEY, SHOP_LATEST), []);

  const items = SHOP_ITEMS.filter((item) => item.kind === shelf);
  const chosen = items.find((item) => item.id === chosenId) ?? null;
  const has = (item: ShopItem) => owned.includes(`${item.kind}:${item.id}`);

  const buy = async (item: ShopItem) => {
    setBuying(true);
    const result = await onPurchase(item.kind, item.id);
    setBuying(false);
    if ("error" in result) return toast.error(result.error);
    setOwned((list) => [...list, `${item.kind}:${item.id}`]);
    setCoins((c) => c - item.cost);
    if (PACK_KINDS.includes(item.kind)) setOpening(PACK_BY_ID.get(item.id) ?? null);
  };

  return (
    <Stage>
      <div className="flex h-100 w-full gap-3 px-4 pt-17 pb-3">
        {/* The shelves, with the way back under them. */}
        <nav className="flex w-40 shrink-0 flex-col justify-between gap-2">
          <ul className="scroll-fade flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SHOP_KINDS.map((kind) => {
              const { label, icon: Icon } = SHELVES[kind];
              return (
                <li key={kind}>
                  <button
                    type="button"
                    aria-pressed={kind === shelf}
                    onClick={() => {
                      setShelf(kind);
                      setChosenId(null);
                    }}
                    className={cn(TILE, "w-full flex-row justify-start gap-2.5 py-2 text-left fs-2xs font-bold tracking-wide uppercase", kind === shelf ? LIT : UNLIT)}
                  >
                    <Icon className="size-5 shrink-0 text-gold-200" />
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
          <BackLink />
        </nav>

        {/* What is on the shelf. */}
        <ul className="scroll-fade grid min-h-0 flex-1 auto-rows-max grid-cols-[repeat(auto-fill,minmax(calc(var(--spacing)*36),1fr))] gap-3 overflow-y-auto overscroll-contain px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={item === chosen}
                onClick={() => setChosenId(item.id)}
                className={cn(TILE, "w-full", item === chosen ? LIT : UNLIT)}
              >
                {has(item) ? (
                  <span aria-label="Owned" className="absolute top-2 left-2 flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-cosmos-950">
                    <Check className="size-4" />
                  </span>
                ) : null}
                <span className={HEADING}>{item.title}</span>
                <Cover item={item} className="w-24" />
                <span className={PRICE}>
                  <Coins className="size-4 text-gold-400" />
                  {item.cost.toLocaleString()}
                </span>
              </button>
            </li>
          ))}
          {items.length === 0 ? (
            // ponytail: an empty shelf until its items exist; list them in lib/shop.ts and this tile goes.
            <li className={cn(TILE, "justify-center border-2 border-dashed border-cosmos-500/70 bg-cosmos-950/50 ring-0")} style={{ minHeight: "calc(var(--spacing) * 44)" }}>
              <span className="font-display text-sm font-black tracking-widest text-cosmos-500 uppercase">Coming soon</span>
            </li>
          ) : null}
        </ul>

        {/* The chosen item. */}
        <section className="flex w-72 shrink-0 flex-col items-center gap-3 rounded-2xl bg-cosmos-950/80 p-4 text-center ring-3 ring-cosmos-500 ring-inset">
          {chosen ? (
            <>
              <h1 className="font-display text-base font-black tracking-widest text-gold-400 uppercase">{chosen.title}</h1>
              <Cover item={chosen} className="w-28 rounded-2xl" />
              <p className="text-xs text-cosmos-300">{chosen.description}</p>
              {contents(chosen) ? <span className={HEADING}>{contents(chosen)}</span> : null}
              <button
                type="button"
                disabled={has(chosen) || buying || coins < chosen.cost}
                onClick={() => void buy(chosen)}
                className="mt-auto flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gold-400 font-display text-sm font-black tracking-wide text-cosmos-950 uppercase shadow-lg hover:bg-gold-200 disabled:bg-cosmos-700 disabled:text-cosmos-300"
              >
                {has(chosen) ? (
                  "Owned"
                ) : buying ? (
                  "Buying…"
                ) : (
                  <>
                    Buy for <Coins className="size-5" /> {chosen.cost.toLocaleString()}
                  </>
                )}
              </button>
            </>
          ) : (
            <p className="m-auto text-base font-bold text-cosmos-300">{items.length > 0 ? "Pick something from the shelf" : "Nothing on this shelf yet"}</p>
          )}
        </section>
      </div>

      {opening ? <PackOpening pack={opening} onClose={() => setOpening(null)} /> : null}
    </Stage>
  );
}
