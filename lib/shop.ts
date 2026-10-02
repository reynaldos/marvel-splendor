import { PACKS } from "@/lib/engine/data";

/** The shelves of the shop, in sidebar order. Only packs have anything on them yet. */
export const SHOP_KINDS = ["pack", "background", "music", "tile", "theme"] as const;
export type ShopKind = (typeof SHOP_KINDS)[number];

export interface ShopItem {
  kind: ShopKind;
  id: string;
  title: string;
  description: string;
  cover: string;
  cost: number;
}

// To sell on another shelf: list its items here from a data/ file, and give the player what they
// bought where `ownedPacks` in lib/record-purchase.ts reads purchases back.
export const SHOP_ITEMS: ShopItem[] = PACKS.map((p) => ({
  kind: "pack",
  id: p.id,
  title: p.title,
  description: p.description,
  cover: p.cover,
  cost: p.cost,
}));

/** What is for sale under that name, or undefined; the price comes from here, never from a client. */
export function shopItem(kind: string, id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.kind === kind && item.id === id);
}
