import { PACKS } from "@/lib/engine/data";

/** The shelves of the shop, in sidebar order. Only card packs and Location packs have anything on them yet. */
export const SHOP_KINDS = ["pack", "background", "music", "tile", "theme"] as const;
export type ShopKind = (typeof SHOP_KINDS)[number];

export interface ShopItem {
  kind: ShopKind;
  id: string;
  title: string;
  description: string;
  cover: string;
  cost: number;
  /** The day it went on sale. */
  releasedAt: string;
}

// To sell on another shelf: list its items here from a data/ file, and give the player what they
// bought where `ownedPacks` in lib/record-purchase.ts reads purchases back.
export const SHOP_ITEMS: ShopItem[] = PACKS.map((p) => ({
  kind: p.locations?.length ? "tile" : "pack",
  id: p.id,
  title: p.title,
  description: p.description,
  cover: p.cover,
  cost: p.cost,
  releasedAt: p.releasedAt,
}));

/** The newest day anything went on sale; a device that has seen it has seen the whole shop. */
export const SHOP_LATEST = SHOP_ITEMS.map((item) => item.releasedAt).sort().at(-1) ?? "";
export const SHOP_SEEN_KEY = "shop-seen";

/** The shelves whose items are packs, dealt into a game when someone at the table owns them. */
export const PACK_KINDS: ShopKind[] = ["pack", "tile"];

/** What is for sale under that name, or undefined; the price comes from here, never from a client. */
export function shopItem(kind: string, id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.kind === kind && item.id === id);
}
