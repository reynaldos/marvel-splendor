import { prisma } from "@/lib/db";
import { Prisma, type User } from "@/lib/generated/prisma/client";

/**
 * The subset of the Auth0 ID token / userinfo claims we need to provision a
 * local `User` row. Matches (a subset of) the `User` shape exported by
 * `@auth0/nextjs-auth0/server`'s `SessionData["user"]` — callers typically
 * pass `session.user` straight through.
 */
export type Auth0Profile = {
  sub: string;
  nickname?: string;
  email?: string;
  name?: string;
};

const USERNAME_FALLBACK = "player";
const MAX_USERNAME_LENGTH = 20;

/**
 * Derives a URL/display-safe default username from an Auth0 profile.
 * Preference order: nickname, then the local part of the email, then a
 * generic fallback. ARCHITECTURE.md mentions a "username-picker step" on
 * first login but does not specify its UI/route, so first-login provisioning
 * here always assigns a sensible default; renaming is left to a future
 * profile-edit affordance (see judgment call notes for step 2 in the PR/task
 * report).
 */
function deriveUsernameBase(profile: Auth0Profile): string {
  const candidate = profile.nickname || profile.email?.split("@")[0] || profile.name || "";

  const sanitized = candidate
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_USERNAME_LENGTH);

  return sanitized.length > 0 ? sanitized : USERNAME_FALLBACK;
}

/**
 * Finds a `username` that isn't already taken, starting from `base`. Tries
 * the bare base, then `base-2`, `base-3`, ... `base-6`, then falls back to a
 * random suffix so this always terminates even under heavy collision.
 */
async function findAvailableUsername(base: string): Promise<string> {
  const existingBase = await prisma.user.findUnique({ where: { username: base } });
  if (!existingBase) return base;

  for (let suffix = 2; suffix <= 6; suffix++) {
    const candidate = `${base}-${suffix}`.slice(0, MAX_USERNAME_LENGTH + 6);
    const existing = await prisma.user.findUnique({ where: { username: candidate } });
    if (!existing) return candidate;
  }

  // Last resort: a short random suffix. Collision odds are astronomically
  // low, but we still guard the create call below against a P2002 race.
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${randomSuffix}`;
}

/**
 * Checks whether a Prisma error is a P2002 unique-constraint violation on
 * `field`. Depending on the database provider, `error.meta.target` may be
 * either the array of column names or the underlying constraint name (which
 * itself embeds the column name), so we check both shapes defensively
 * instead of asserting Postgres's exact default naming convention.
 */
function isUniqueConstraintError(error: unknown, field: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;
  if (Array.isArray(target)) return target.includes(field);
  if (typeof target === "string") return target.includes(field);
  return false;
}

/**
 * Ensures a `User` (+ empty `UserStats`) row exists for the given Auth0
 * `sub`, creating one on first sight. Idempotent and safe to call on every
 * authenticated request/route handler — pass `session.user` from
 * `auth0.getSession()`.
 */
export async function getOrCreateUser(profile: Auth0Profile): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { auth0Sub: profile.sub } });
  if (existing) {
    // Keeps the email in step with the sign-in, writing only when it has changed.
    if (!profile.email || profile.email === existing.email) return existing;
    return prisma.user.update({ where: { id: existing.id }, data: { email: profile.email } });
  }

  const base = deriveUsernameBase(profile);

  // A handful of attempts covers the (rare) case where a concurrent request
  // claims the username we picked between our availability check and the
  // create call.
  for (let attempt = 0; attempt < 5; attempt++) {
    const username = await findAvailableUsername(base);

    try {
      return await prisma.user.create({
        data: {
          auth0Sub: profile.sub,
          username,
          email: profile.email,
          stats: { create: {} },
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error, "auth0Sub")) {
        // Another concurrent request already provisioned this same Auth0
        // user — return that row instead of erroring.
        const created = await prisma.user.findUnique({ where: { auth0Sub: profile.sub } });
        if (created) return created;
      }

      if (isUniqueConstraintError(error, "username")) {
        // Username was claimed between our check and the insert; retry with
        // a fresh candidate.
        continue;
      }

      throw error;
    }
  }

  throw new Error(`Failed to provision a User for Auth0 sub "${profile.sub}" after several attempts`);
}
