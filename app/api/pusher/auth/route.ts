import { NextResponse } from "next/server";

import { auth0 } from "@/lib/auth0";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { authorizeUserChannel } from "@/lib/pusher";

/** POST /api/pusher/auth — signs a subscription to the signed-in player's own private channel, and nothing else. */
export async function POST(request: Request) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const user = await getOrCreateUser(session.user);
  const form = await request.formData();
  const socketId = form.get("socket_id");
  const channel = form.get("channel_name");
  if (typeof socketId !== "string" || typeof channel !== "string") return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const auth = authorizeUserChannel(socketId, channel, user.id);
  return auth ? NextResponse.json(auth) : NextResponse.json({ error: "Forbidden." }, { status: 403 });
}
