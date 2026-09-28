import { randomUUID } from "node:crypto";

import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { libraryAvatarSrc } from "@/lib/avatars";

// Cloudflare R2 is S3-API-compatible; the AWS SDK just needs a custom
// endpoint + "auto" region. Env vars per .env.example.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

let cachedClient: S3Client | null = null;

function getR2Client(): S3Client {
  if (cachedClient) return cachedClient;

  const accountId = requireEnv("R2_ACCOUNT_ID");
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  return cachedClient;
}

function getBucket(): string {
  return requireEnv("R2_BUCKET");
}

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2MB

export const AVATAR_ALLOWED_CONTENT_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const PRESIGN_EXPIRES_SECONDS = 5 * 60;

/**
 * Generates a presigned R2 PUT URL scoped to `userId`, plus the object key
 * the client will upload to. The presign request pins `ContentType` and
 * `ContentLength`, so the signature is only valid for an upload matching
 * those exact headers — this is how we enforce the size/type limit without
 * a separate S3 POST-policy flow.
 */
export async function createAvatarUploadUrl(
  userId: string,
  contentType: string,
  contentLength: number
): Promise<{ key: string; uploadUrl: string }> {
  const extension = AVATAR_ALLOWED_CONTENT_TYPES[contentType];
  if (!extension) {
    throw new Error(`Unsupported avatar content type: ${contentType}`);
  }
  if (contentLength <= 0 || contentLength > AVATAR_MAX_BYTES) {
    throw new Error(`Avatar file size must be between 1 and ${AVATAR_MAX_BYTES} bytes`);
  }

  const key = `avatars/${userId}/${randomUUID()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });

  const uploadUrl = await getSignedUrl(getR2Client(), command, {
    expiresIn: PRESIGN_EXPIRES_SECONDS,
  });

  return { key, uploadUrl };
}

/** Confirms an object was actually uploaded (exists) before trusting the key. */
export async function avatarObjectExists(key: string): Promise<boolean> {
  try {
    await getR2Client().send(new HeadObjectCommand({ Bucket: getBucket(), Key: key }));
    return true;
  } catch {
    return false;
  }
}

/** Best-effort cleanup of a replaced/orphaned avatar object. Never throws. */
export async function deleteAvatarObject(key: string): Promise<void> {
  try {
    await getR2Client().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
  } catch {
    // Non-fatal: an orphaned object in R2 is not worth failing the request over.
  }
}

/** Where a player's picture is, uploaded or from the library, or `null` if they have none. */
export function publicAvatarUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  const fromLibrary = libraryAvatarSrc(key);
  if (fromLibrary) return fromLibrary;
  // Without storage set up there is no picture to show; that must not take the page down.
  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  return base ? `${base}/${key}` : null;
}

/** A key must live under the requesting user's own prefix — defends the confirm step. */
export function isOwnAvatarKey(userId: string, key: string): boolean {
  return key.startsWith(`avatars/${userId}/`) && !key.includes("..");
}
