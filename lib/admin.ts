/** Only a verified email counts: anyone can sign up claiming an address they don't own. */
export function isAdmin(
  user: { email?: string; email_verified?: boolean },
  allowed = process.env.ADMIN_EMAILS ?? "",
): boolean {
  if (!user.email || user.email_verified !== true) return false;
  const emails = allowed.split(",").map((email) => email.trim().toLowerCase());
  return emails.includes(user.email.toLowerCase());
}
