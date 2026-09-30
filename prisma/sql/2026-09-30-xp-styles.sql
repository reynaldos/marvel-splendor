-- Adds the two profile switches for the account-level frames. Every existing player starts with both off.
-- Matches prisma/schema.prisma. Safe to run once; a second run stops at the first line, as the columns are already there.
BEGIN;

ALTER TABLE "User" ADD COLUMN "xpAvatarStyle" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "xpCardStyle" BOOLEAN NOT NULL DEFAULT false;

COMMIT;

-- To undo:  ALTER TABLE "User" DROP COLUMN "xpAvatarStyle", DROP COLUMN "xpCardStyle";
