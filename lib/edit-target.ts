import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/get-or-create-user";

type SessionUser = Parameters<typeof getOrCreateUser>[0] & Parameters<typeof isAdmin>[0];

/** The player whose profile is being edited: the signed-in one, or another named by an admin. Null when that isn't allowed or doesn't exist. */
export async function editTarget(sessionUser: SessionUser, forUser?: string | null) {
  const self = await getOrCreateUser(sessionUser);
  if (!forUser || forUser === self.username) return self;
  if (!isAdmin(sessionUser)) return null;
  return prisma.user.findUnique({ where: { username: forUser } });
}
