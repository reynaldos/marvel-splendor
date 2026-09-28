import Link from "next/link";
import { redirect } from "next/navigation";

import { AvatarUploadForm } from "@/components/profile/avatar-upload-form";
import { StatsGrid } from "@/components/profile/stats-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { defaultUserStatsSnapshot } from "@/lib/record-stats";
import { publicAvatarUrl } from "@/lib/r2";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("Settings", "Your profile picture and stats.", true);

// Own-profile edit + avatar upload — ARCHITECTURE.md §6: `settings/page.tsx`.
export default async function SettingsPage() {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/settings");

  const user = await getOrCreateUser(session.user);
  const stats = await prisma.userStats.findUnique({ where: { userId: user.id } });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <AvatarUploadForm username={user.username} avatarUrl={publicAvatarUrl(user.avatarKey)} />
          <Button asChild variant="ghost" size="sm" className="self-start">
            <Link href={`/profile/${user.username}`}>View public profile</Link>
          </Button>
        </CardContent>
      </Card>

      <StatsGrid stats={stats ?? defaultUserStatsSnapshot} />
    </div>
  );
}
