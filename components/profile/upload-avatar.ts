export const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

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
  if (file.size > MAX_BYTES) return "The picture must be smaller than 10MB.";
  return checkAvatarType(file);
}

/** The type check alone, for a picture that will be cut down to size before it is sent. */
export function checkAvatarType(file: { type: string }): string | null {
  return AVATAR_TYPES.includes(file.type) ? null : "Choose a PNG, JPEG or WebP picture.";
}

/**
 * Sends a cropped picture and the full-size original it was cut from to storage, and makes the
 * crop the player's picture, or another player's for an admin. Throws with a message to show.
 */
export async function uploadAvatar(crop: File, original: File, forUser: string | null = null): Promise<void> {
  const problem = checkAvatarFile(crop) ?? checkAvatarFile(original);
  if (problem) throw new Error(problem);

  const size = (file: File) => ({ contentType: file.type, contentLength: file.size });
  const { key, uploadUrl, originalUploadUrl } = await send(
    "POST",
    { crop: size(crop), original: size(original), forUser },
    "Could not start the upload.",
  );
  const put = (url: string, file: File) => fetch(url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  const stored = await Promise.all([put(uploadUrl, crop), put(originalUploadUrl, original)]);
  if (stored.some((res) => !res.ok)) throw new Error("The upload failed.");
  await send("PUT", { key, forUser }, "Could not save the picture.");
}
