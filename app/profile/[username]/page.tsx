import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsGrid } from "@/components/profile/stats-grid";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { defaultUserStatsSnapshot } from "@/lib/record-stats";
import { publicAvatarUrl } from "@/lib/r2";

// Public profile + stats — ARCHITECTURE.md §6: `profile/[username]/page.tsx`.
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    include: { stats: true },
  });

  if (!user) notFound();

  const session = await auth0.getSession();
  const isOwnProfile = session?.user.sub === user.auth0Sub;
  const avatarUrl = publicAvatarUrl(user.avatarKey);
  const stats = user.stats ?? defaultUserStatsSnapshot;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={user.username} /> : null}
              <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{user.username}</CardTitle>
              <p className="text-xs text-muted-foreground">
                Joined {user.createdAt.toLocaleDateString()}
              </p>
            </div>
          </div>
          {isOwnProfile ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/settings">Edit profile</Link>
            </Button>
          ) : null}
        </CardHeader>
      </Card>

      <StatsGrid stats={stats} />
    </div>
  );
}
