-- Adds what a finished game gave each player, for the results screen. Every existing game's players start empty.
-- Matches prisma/schema.prisma. Safe to run once; a second run stops at the first line, as the column is already there.
BEGIN;

ALTER TABLE "GamePlayer" ADD COLUMN "rewards" JSONB;

COMMIT;

-- To undo:  ALTER TABLE "GamePlayer" DROP COLUMN "rewards";
