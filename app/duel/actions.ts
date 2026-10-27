"use server";

import { redirect } from "next/navigation";

import { auth0 } from "@/lib/auth0";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { createLobby, extractCheatCode, withCheat } from "@/lib/lobby";
import { clockOf, TURN_TIME_OPTIONS } from "@/lib/lobby-rules";

/** Opens a Duel room for two: the host and one friend by code. */
export async function createDuelRoomAction(formData: FormData) {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/duel");
  const user = await getOrCreateUser(session.user);
  const sent = formData.get("turnTimeSeconds");
  const gameId = await createLobby(user.id, {
    rules: "duel",
    // Duel ends on its own three conditions; the points field is not read.
    targetPoints: 20,
    // "off" is a game with no turn clock.
    turnTimeSeconds: sent === "off" ? null : (TURN_TIME_OPTIONS.find((o) => o === Number(sent)) ?? TURN_TIME_OPTIONS[0]),
    gameTimeMinutes: clockOf(formData.get("gameTimeMinutes")),
  });
  const { cheat } = extractCheatCode(String(formData.get("code") ?? ""));
  redirect(withCheat(`/lobby/${gameId}`, cheat));
}
