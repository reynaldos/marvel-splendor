"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { useSeen } from "@/components/seen";
import { NewDot } from "@/components/UpdateLog";
import { SHOP_LATEST, SHOP_SEEN_KEY } from "@/lib/shop";

/** The round Shop button, with a gold dot while the shop holds something this device hasn't seen. */
export function ShopButton() {
  const seen = useSeen(SHOP_SEEN_KEY, SHOP_LATEST);
  return (
    <Link
      href="/shop"
      aria-label="Shop"
      className="relative flex size-12 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset outline-none hover:bg-cosmos-500 focus-visible:ring-gold-400"
    >
      <ShoppingBag className="size-6" />
      {seen === null || seen < SHOP_LATEST ? <NewDot label="New in the shop" className="absolute top-0 right-0" /> : null}
    </Link>
  );
}
