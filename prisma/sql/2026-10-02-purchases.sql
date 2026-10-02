-- Adds the table of what each player has bought in the shop. It changes no existing table.
-- Written by Prisma from prisma/schema.prisma, so the database matches it exactly.
-- Safe to run once; a second run stops at the first line, as the table is already there.
BEGIN;

CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Purchase_userId_kind_itemId_key" ON "Purchase"("userId", "kind", "itemId");

CREATE INDEX "Purchase_createdAt_idx" ON "Purchase"("createdAt");

ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;

-- To undo:  DROP TABLE "Purchase";
