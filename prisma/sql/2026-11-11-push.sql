-- Adds push notifications: the account's on/off switch, on for everyone, and one row per device that allowed push.
-- Written by Prisma from prisma/schema.prisma (prisma migrate diff), so the database matches it exactly.
-- Safe to run once; a second run stops at the first line, as the column is already there.
BEGIN;

ALTER TABLE "User" ADD COLUMN "pushEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;

-- To undo:  DROP TABLE "PushSubscription"; ALTER TABLE "User" DROP COLUMN "pushEnabled";
