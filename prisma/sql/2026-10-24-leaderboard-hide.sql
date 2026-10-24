-- Adds the profile switch that keeps a player off the leaderboard. Everyone starts shown.
-- Matches prisma/schema.prisma. Safe to run once; a second run stops at the first line, as the column is already there.
BEGIN;

ALTER TABLE "User" ADD COLUMN "hideFromLeaderboard" BOOLEAN NOT NULL DEFAULT false;

COMMIT;

-- To undo:  ALTER TABLE "User" DROP COLUMN "hideFromLeaderboard";
