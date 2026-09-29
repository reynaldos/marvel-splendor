-- Adds the table of cards each player has collected. It changes no existing table.
-- Written by Prisma from prisma/schema.prisma, so the database matches it exactly.
-- Safe to run once; a second run stops at the first line, as the table is already there.
BEGIN;

CREATE TABLE "CollectedCard" (
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "times" INTEGER NOT NULL DEFAULT 1,
    "firstFoundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollectedCard_pkey" PRIMARY KEY ("userId","cardId")
);

ALTER TABLE "CollectedCard" ADD CONSTRAINT "CollectedCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;

-- To undo:  DROP TABLE "CollectedCard";
