import { NextResponse } from "next/server";

import { auth0 } from "@/lib/auth0";
import { loadFriends } from "@/lib/friends";
import { getOrCreateUser } from "@/lib/get-or-create-user";

/** GET /api/friends — the signed-in player's friends, requests both ways, blocks and waiting count, for the Friends screen's poll. */
export async function GET() {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const user = await getOrCreateUser(session.user);
  return NextResponse.json(await loadFriends(user.id), { headers: { "Cache-Control": "no-store" } });
}
