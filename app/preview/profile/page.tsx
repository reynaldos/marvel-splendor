import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { AVATAR_LIBRARY } from "@/lib/avatars";
import { careerStats } from "@/lib/career-stats";
import { defaultUserStatsSnapshot } from "@/lib/record-stats";
import { pageMetadata } from "@/lib/site";

import { PreviewMenu } from "../PreviewBar";

export const metadata = pageMetadata("Profile preview", undefined, true);

/**
 * Another player's profile as a visitor sees it, with no games to list. `?own=1` makes it the viewer's own,
 * where `?effects=1` and `?border=1` are the two frame switches (off and on when left out).
 */
export default async function ProfilePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ own?: string; effects?: string; border?: string }>;
}) {
  const { own: ownParam, effects = "0", border = "1" } = await searchParams;
  const own = ownParam === "1";
  return (
    <>
      <ProfileScreen
        username="rival"
        name="A Rival"
        avatarUrl={AVATAR_LIBRARY[0].src}
        rating={1077}
        xpAvatarStyle={effects === "1"}
        xpCardStyle={border === "1"}
        stats={defaultUserStatsSnapshot}
        xp={7448}
        career={careerStats([])}
        records={careerStats([])}
        games={null}
        isOwn={own}
        canEdit={own}
      />
      <PreviewMenu />
    </>
  );
}
