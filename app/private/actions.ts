"use server";

import { redirect } from "next/navigation";

import { auth0 } from "@/lib/auth0";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { createLobby, extractCheatCode, withCheat } from "@/lib/lobby";
import { roomSettings } from "@/lib/lobby-rules";

export async function createGameAction(formData: FormData) {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/private");
  const user = await getOrCreateUser(session.user);
  const gameId = await createLobby(user.id, roomSettings(false, formData));
  // "+cheat" typed where a room code goes turns cheat mode on for the host.
  const { cheat } = extractCheatCode(String(formData.get("code") ?? ""));
  redirect(withCheat(`/lobby/${gameId}`, cheat));
}

// The join page does the joining and the sign-in check.
export async function joinGameAction(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  redirect(`/join/${encodeURIComponent(code)}`);
}
