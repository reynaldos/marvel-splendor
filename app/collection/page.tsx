import { redirect } from "next/navigation";

import { CollectionScreen } from "@/components/profile/CollectionScreen";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("Collection", "Every card you have recruited.", true);

export default async function CollectionPage() {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/collection");

  const user = await getOrCreateUser(session.user);
  const found = await prisma.collectedCard.findMany({
    where: { userId: user.id },
    select: { cardId: true, times: true },
  });

  return <CollectionScreen found={Object.fromEntries(found.map((c) => [c.cardId, c.times]))} />;
}
