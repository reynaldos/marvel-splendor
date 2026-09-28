"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { auth0 } from "@/lib/auth0";
import { libraryAvatarKey, libraryAvatarSrc } from "@/lib/avatars";
import { prisma } from "@/lib/db";
import { isUniqueViolation } from "@/lib/game-server";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { deleteAvatarObject } from "@/lib/r2";
import { checkName, checkUsername } from "@/lib/username";

export interface SaveState {
  ok: boolean;
  message: string;
}

const TAKEN: SaveState = { ok: false, message: "That username is taken." };

async function signedInUser() {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/settings");
  return getOrCreateUser(session.user);
}

/** Whether the signed-in player could take this username. */
export async function checkUsernameAction(typed: string): Promise<SaveState> {
  const user = await signedInUser();
  const checked = checkUsername(typed);
  if ("error" in checked) return { ok: false, message: checked.error };

  const holder = await prisma.user.findUnique({ where: { username: checked.username }, select: { id: true } });
  return holder && holder.id !== user.id ? TAKEN : { ok: true, message: "Available" };
}

export interface ProfileChanges {
  username: string;
  name: string;
  /** A picture chosen from the library, or null to leave the picture as it is. */
  avatarId: string | null;
}

export async function saveProfileAction(changes: ProfileChanges): Promise<SaveState> {
  const user = await signedInUser();
  const checked = checkUsername(changes.username);
  if ("error" in checked) return { ok: false, message: checked.error };
  const named = checkName(changes.name);
  if ("error" in named) return { ok: false, message: named.error };
  const avatarKey = changes.avatarId === null ? undefined : libraryAvatarKey(changes.avatarId);
  if (avatarKey === null) return { ok: false, message: "That picture isn't in the library." };

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { username: checked.username, name: named.name, avatarKey },
    });
  } catch (error) {
    // Someone can take the name between the check and the save; the database has the last word.
    if (isUniqueViolation(error, "username")) return TAKEN;
    throw error;
  }
  // An uploaded picture that is no longer used is cleared out of storage.
  if (avatarKey && user.avatarKey && !libraryAvatarSrc(user.avatarKey)) void deleteAvatarObject(user.avatarKey);
  refresh();
  return { ok: true, message: "Saved" };
}
