"use server";

import { redirect } from "next/navigation";

import { auth0 } from "@/lib/auth0";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { createLobby, extractCheatCode, withCheat } from "@/lib/lobby";
import { roomSettings } from "@/lib/lobby-rules";

/** Opens a Duel room for two: the host and one friend by code. */
export async function createDuelRoomAction(formData: FormData) {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/duel");
  const user = await getOrCreateUser(session.user);
  const gameId = await createLobby(user.id, roomSettings(true, formData));
  const { cheat } = extractCheatCode(String(formData.get("code") ?? ""));
  redirect(withCheat(`/lobby/${gameId}`, cheat));
}
