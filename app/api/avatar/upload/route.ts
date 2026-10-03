import { NextResponse } from "next/server";
import { z } from "zod";

import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { editTarget } from "@/lib/edit-target";
import {
  AVATAR_ALLOWED_CONTENT_TYPES,
  AVATAR_MAX_BYTES,
  avatarObjectExists,
  createAvatarUploadUrls,
  deleteAvatarObject,
  isOwnAvatarKey,
  originalAvatarKey,
} from "@/lib/r2";

// Avatar upload is a two-step, direct-to-R2 flow per ARCHITECTURE.md §7:
//   1. POST -> issue presigned R2 PUT URLs (size/type-limited) for the crop and its original, + the crop's key.
//   2. Client PUTs both files straight to R2 using those URLs.
//   3. PUT (this route) -> confirm the crop landed, then persist its key
//      on the User row.

// `forUser` names another player, which only an admin may do.
const pictureSchema = z.object({ contentType: z.string(), contentLength: z.number().int().positive() });
const requestUploadSchema = z.object({
  crop: pictureSchema,
  original: pictureSchema,
  forUser: z.string().nullish(),
});

const confirmUploadSchema = z.object({
  key: z.string().min(1),
  forUser: z.string().nullish(),
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

  const { crop, original, forUser } = parsed.data;
  for (const picture of [crop, original]) {
    if (!Object.hasOwn(AVATAR_ALLOWED_CONTENT_TYPES, picture.contentType)) {
      return NextResponse.json(
        { error: `Unsupported content type. Allowed: ${Object.keys(AVATAR_ALLOWED_CONTENT_TYPES).join(", ")}` },
        { status: 400 }
      );
    }
    if (picture.contentLength > AVATAR_MAX_BYTES) {
      return NextResponse.json({ error: `File too large. Max ${AVATAR_MAX_BYTES} bytes` }, { status: 400 });
    }
  }

  const user = await editTarget(session.user, forUser);
  if (!user) return NextResponse.json({ error: "You can't edit that profile." }, { status: 403 });
  return NextResponse.json(await createAvatarUploadUrls(user.id, crop, original));
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

  const { key, forUser } = parsed.data;
  const user = await editTarget(session.user, forUser);
  if (!user) return NextResponse.json({ error: "You can't edit that profile." }, { status: 403 });

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

  if (previousKey && previousKey !== key && isOwnAvatarKey(user.id, previousKey)) {
    // Fire-and-forget cleanup of the replaced picture and the original it was cut from.
    void deleteAvatarObject(previousKey);
    void deleteAvatarObject(originalAvatarKey(previousKey));
  }

  return NextResponse.json({ avatarKey: updated.avatarKey });
}
