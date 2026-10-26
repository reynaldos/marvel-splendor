"use server";

import { redirect } from "next/navigation";

import { auth0 } from "@/lib/auth0";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { createLobby, extractCheatCode, withCheat } from "@/lib/lobby";
import { clockOf, POINT_OPTIONS, TURN_TIME_OPTIONS } from "@/lib/lobby-rules";

/** The submitted number if it is one of the choices on offer, else the first choice. */
function pick(options: number[], value: FormDataEntryValue | null): number {
  return options.find((o) => o === Number(value)) ?? options[0];
}

export async function createGameAction(formData: FormData) {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/private");
  const user = await getOrCreateUser(session.user);
  const gameId = await createLobby(user.id, {
    targetPoints: pick(POINT_OPTIONS, formData.get("targetPoints")),
    turnTimeSeconds: pick(TURN_TIME_OPTIONS, formData.get("turnTimeSeconds")),
    gameTimeMinutes: clockOf(formData.get("gameTimeMinutes")),
  });
  // "+cheat" typed where a room code goes turns cheat mode on for the host.
  const { cheat } = extractCheatCode(String(formData.get("code") ?? ""));
  redirect(withCheat(`/lobby/${gameId}`, cheat));
}

// The join page does the joining and the sign-in check.
export async function joinGameAction(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  redirect(`/join/${encodeURIComponent(code)}`);
}
