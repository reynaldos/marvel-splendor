import { NextResponse } from "next/server";
import { z } from "zod";

import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import {
  AVATAR_ALLOWED_CONTENT_TYPES,
  AVATAR_MAX_BYTES,
  avatarObjectExists,
  createAvatarUploadUrl,
  deleteAvatarObject,
  isOwnAvatarKey,
} from "@/lib/r2";

// Avatar upload is a two-step, direct-to-R2 flow per ARCHITECTURE.md §7:
//   1. POST -> issue a presigned R2 PUT URL (size/type-limited) + object key.
//   2. Client PUTs the file bytes straight to R2 using that URL.
//   3. PUT (this route) -> confirm the object landed, then persist the key
//      on the User row.

const requestUploadSchema = z.object({
  contentType: z.string(),
  contentLength: z.number().int().positive(),
});

const confirmUploadSchema = z.object({
  key: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = requestUploadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { contentType, contentLength } = parsed.data;
  if (!Object.hasOwn(AVATAR_ALLOWED_CONTENT_TYPES, contentType)) {
    return NextResponse.json(
      { error: `Unsupported content type. Allowed: ${Object.keys(AVATAR_ALLOWED_CONTENT_TYPES).join(", ")}` },
      { status: 400 }
    );
  }
  if (contentLength > AVATAR_MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large. Max ${AVATAR_MAX_BYTES} bytes` },
      { status: 400 }
    );
  }

  const user = await getOrCreateUser(session.user);
  const { key, uploadUrl } = await createAvatarUploadUrl(user.id, contentType, contentLength);

  return NextResponse.json({ key, uploadUrl });
}

export async function PUT(request: Request) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = confirmUploadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const user = await getOrCreateUser(session.user);
  const { key } = parsed.data;

  if (!isOwnAvatarKey(user.id, key)) {
    return NextResponse.json({ error: "Key does not belong to this user" }, { status: 403 });
  }

  const exists = await avatarObjectExists(key);
  if (!exists) {
    return NextResponse.json({ error: "Upload not found — did the PUT to R2 succeed?" }, { status: 400 });
  }

  const previousKey = user.avatarKey;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { avatarKey: key },
  });

  if (previousKey && previousKey !== key) {
    // Fire-and-forget cleanup of the replaced avatar object.
    void deleteAvatarObject(previousKey);
  }

  return NextResponse.json({ avatarKey: updated.avatarKey });
}
