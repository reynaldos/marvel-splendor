import { NextResponse } from "next/server";

import { auth0 } from "@/lib/auth0";
import { libraryAvatarSrc } from "@/lib/avatars";
import { editTarget } from "@/lib/edit-target";
import { originalAvatarKey, publicAvatarUrl } from "@/lib/r2";

/** The full-size original of the player's uploaded picture, served from here so the settings page can recrop it; `?user=` for an admin. A picture from before originals were kept is served as it is. */
export async function GET(request: Request) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await editTarget(session.user, new URL(request.url).searchParams.get("user"));
  const key = user?.avatarKey && !libraryAvatarSrc(user.avatarKey) ? user.avatarKey : null;
  if (!key) return NextResponse.json({ error: "No uploaded picture." }, { status: 404 });

  let picture = await fetch(publicAvatarUrl(originalAvatarKey(key))!);
  if (!picture.ok) picture = await fetch(publicAvatarUrl(key)!);
  if (!picture.ok) return NextResponse.json({ error: "The picture could not be read." }, { status: 502 });
  return new Response(picture.body, {
    headers: { "Content-Type": picture.headers.get("Content-Type") ?? "image/jpeg", "Cache-Control": "no-store" },
  });
}
