-- Adds room invites: a friend asked to a room, waiting until they join or decline. It changes no existing table.
-- Written by Prisma from prisma/schema.prisma (prisma migrate diff), so the database matches it exactly.
-- Safe to run once; a second run stops at the first line, as the type is already there.
BEGIN;

CREATE TYPE "GameInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

CREATE TABLE "GameInvite" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "status" "GameInviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    CONSTRAINT "GameInvite_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GameInvite_toUserId_status_idx" ON "GameInvite"("toUserId", "status");

CREATE UNIQUE INDEX "GameInvite_gameId_toUserId_key" ON "GameInvite"("gameId", "toUserId");

ALTER TABLE "GameInvite" ADD CONSTRAINT "GameInvite_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GameInvite" ADD CONSTRAINT "GameInvite_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GameInvite" ADD CONSTRAINT "GameInvite_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;

-- To undo:  DROP TABLE "GameInvite"; DROP TYPE "GameInviteStatus";
