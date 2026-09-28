export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

/** Tidies what was typed into a username, or says why it can't be one. */
export function checkUsername(typed: string): { username: string } | { error: string } {
  const username = typed.trim().toLowerCase();
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return { error: `Use ${USERNAME_MIN} to ${USERNAME_MAX} characters.` };
  }
  // It is part of the profile's address, so nothing that needs escaping.
  if (!/^[a-z0-9_-]+$/.test(username)) {
    return { error: "Use letters, numbers, - and _ only." };
  }
  return { username };
}

export const NAME_MAX = 40;

/** Tidies a typed name; an empty one means no name. */
export function checkName(typed: string): { name: string | null } | { error: string } {
  const name = typed.trim().replace(/\s+/g, " ");
  if (name.length > NAME_MAX) return { error: `Keep the name to ${NAME_MAX} characters.` };
  return { name: name || null };
}
