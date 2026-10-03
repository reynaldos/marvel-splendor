import { redirect } from "next/navigation";

import { ShopScreen } from "@/components/shop/ShopScreen";
import { TopBar } from "@/components/TopBar";
import { purchaseAction } from "@/app/shop/actions";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("Shop", "Spend your coins on card packs and more.", true);

export default async function ShopPage() {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/shop");
  const user = await getOrCreateUser(session.user);

  const [coins, purchases] = await Promise.all([
    prisma.userCoins.findUnique({ where: { userId: user.id }, select: { balance: true } }),
    prisma.purchase.findMany({ where: { userId: user.id }, select: { kind: true, itemId: true } }),
  ]);

  return (
    <>
      <TopBar />
      <ShopScreen coins={coins?.balance ?? 0} owned={purchases.map((p) => `${p.kind}:${p.itemId}`)} onPurchase={purchaseAction} />
    </>
  );
}
