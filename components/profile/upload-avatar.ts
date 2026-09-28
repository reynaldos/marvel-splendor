export const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

async function send(method: "POST" | "PUT", body: unknown, failure: string) {
  const res = await fetch("/api/avatar/upload", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const reply = await res.json().catch(() => null);
  if (!res.ok) throw new Error(reply?.error ?? failure);
  return reply;
}

/** Why a file can't be a profile picture, or null when it can. */
export function checkAvatarFile(file: { type: string; size: number }): string | null {
  if (!AVATAR_TYPES.includes(file.type)) return "Choose a PNG, JPEG or WebP picture.";
  if (file.size > MAX_BYTES) return "The picture must be smaller than 2MB.";
  return null;
}

/** Sends a picture to storage and makes it the player's. Throws with a message to show. */
export async function uploadAvatar(file: File): Promise<void> {
  const problem = checkAvatarFile(file);
  if (problem) throw new Error(problem);

  const { key, uploadUrl } = await send(
    "POST",
    { contentType: file.type, contentLength: file.size },
    "Could not start the upload.",
  );
  const stored = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!stored.ok) throw new Error("The upload failed.");
  await send("PUT", { key }, "Could not save the picture.");
}
