import { notFound, redirect } from "next/navigation";

import { CollectionScreen } from "@/components/profile/CollectionScreen";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { pageMetadata } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return pageMetadata(`${username}'s collection`, `Every card ${username} has recruited.`, true);
}

export default async function CollectionPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const path = `/profile/${username}/collection`;

  const session = await auth0.getSession();
  if (!session) redirect(`/auth/login?returnTo=${encodeURIComponent(path)}`);

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) notFound();

  const found = await prisma.collectedCard.findMany({
    where: { userId: user.id },
    select: { cardId: true, times: true },
  });

  return (
    <CollectionScreen
      found={Object.fromEntries(found.map((c) => [c.cardId, c.times]))}
      backTo={`/profile/${username}`}
    />
  );
}
