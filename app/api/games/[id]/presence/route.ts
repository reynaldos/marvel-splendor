import { NextResponse } from "next/server";

import { auth0 } from "@/lib/auth0";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { setHostAway } from "@/lib/lobby";

/** POST /api/games/[id]/presence — the host's lobby page reporting that they left it, or are back. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const user = await getOrCreateUser(session.user);

  const body = await request.json().catch(() => null);
  if (typeof body?.away !== "boolean") return NextResponse.json({ error: "Expected { away: boolean }." }, { status: 400 });

  await setHostAway(id, user.id, body.away);
  return new NextResponse(null, { status: 204 });
}
