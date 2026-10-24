"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { auth0 } from "@/lib/auth0";
import { libraryAvatarKey, libraryAvatarSrc } from "@/lib/avatars";
import { prisma } from "@/lib/db";
import { editTarget } from "@/lib/edit-target";
import { isUniqueViolation } from "@/lib/game-server";
import { deleteAvatarObject } from "@/lib/r2";
import { checkName, checkUsername } from "@/lib/username";

export interface SaveState {
  ok: boolean;
  message: string;
}

const TAKEN: SaveState = { ok: false, message: "That username is taken." };

/** The player being edited: the signed-in one, or for an admin the one `forUser` names. */
async function signedInUser(forUser?: string | null) {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/settings");
  const user = await editTarget(session.user, forUser);
  if (!user) throw new Error("You can't edit that profile.");
  return user;
}

/** Removes the player for good. Their finished games stay, with no name on their seat. */
export async function deleteAccountAction() {
  const user = await signedInUser();
  // The rows that don't cascade go first; the seat rows stay, unnamed.
  await prisma.$transaction([
    prisma.gamePlayer.updateMany({ where: { userId: user.id }, data: { userId: null } }),
    prisma.userStats.deleteMany({ where: { userId: user.id } }),
    prisma.userRating.deleteMany({ where: { userId: user.id } }),
    prisma.userCoins.deleteMany({ where: { userId: user.id } }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);
  if (user.avatarKey && !libraryAvatarSrc(user.avatarKey)) void deleteAvatarObject(user.avatarKey);
  redirect("/auth/logout");
}

/** Whether the player being edited could take this username. */
export async function checkUsernameAction(typed: string, forUser?: string | null): Promise<SaveState> {
  const user = await signedInUser(forUser);
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
  /** The level frame as they see it on their own picture: the light on the face, and the border round it and the name card. */
  xpAvatarStyle: boolean;
  xpCardStyle: boolean;
}

export async function saveProfileAction(changes: ProfileChanges, forUser?: string | null): Promise<SaveState> {
  const user = await signedInUser(forUser);
  const checked = checkUsername(changes.username);
  if ("error" in checked) return { ok: false, message: checked.error };
  const named = checkName(changes.name);
  if ("error" in named) return { ok: false, message: named.error };
  const avatarKey = changes.avatarId === null ? undefined : libraryAvatarKey(changes.avatarId);
  if (avatarKey === null) return { ok: false, message: "That picture isn't in the library." };

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        username: checked.username,
        name: named.name,
        avatarKey,
        xpAvatarStyle: changes.xpAvatarStyle === true,
        xpCardStyle: changes.xpCardStyle === true,
      },
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
