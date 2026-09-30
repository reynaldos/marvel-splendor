import { prisma } from "@/lib/db";
import { defaultRatingSnapshot, nextRatings, type RatedPlayer } from "@/lib/rating";

/** One human player's final placement in a rated game — see `rankPlayers()` in `lib/game-record.ts`. */
export type FinishedGamePlacement = Pick<RatedPlayer, "userId" | "place">;

/** Updates every human player's rank, transactionally. Caller gates on 2+ humans — fewer is a no-op. */
export async function recordGameRating(placements: FinishedGamePlacement[]): Promise<void> {
  if (placements.length < 2) return;

  await prisma.$transaction(async (tx) => {
    const players: RatedPlayer[] = [];
    for (const placement of placements) {
      const existing = await tx.userRating.findUnique({ where: { userId: placement.userId } });
      const prev = existing ?? defaultRatingSnapshot;
      players.push({ ...prev, userId: placement.userId, place: placement.place });
    }

    for (const next of nextRatings(players)) {
      await tx.userRating.upsert({
        where: { userId: next.userId },
        create: next,
        update: next,
      });
    }
  });
}
