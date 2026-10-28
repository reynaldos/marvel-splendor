-- Adds when an admin blocked the account; null for everyone else.
-- Matches prisma/schema.prisma. Safe to run once; a second run stops at the first line, as the column is already there.
BEGIN;

ALTER TABLE "User" ADD COLUMN "blockedAt" TIMESTAMP(3);

COMMIT;

-- To undo:  ALTER TABLE "User" DROP COLUMN "blockedAt";
