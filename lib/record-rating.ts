import { prisma } from "@/lib/db";
import { defaultRatingSnapshot, nextRatings, type RatedPlayer } from "@/lib/rating";

/** One human player's final placement in a rated game — see `rankPlayers()` in `lib/game-record.ts`. */
export type FinishedGamePlacement = Pick<RatedPlayer, "userId" | "place">;

/** Updates every human player's rank, transactionally, and says how each moved. Caller gates on 2+ humans — fewer is a no-op. */
export async function recordGameRating(
  placements: FinishedGamePlacement[],
): Promise<Array<{ userId: string; before: number; after: number }>> {
  if (placements.length < 2) return [];

  return prisma.$transaction(async (tx) => {
    const players: RatedPlayer[] = [];
    for (const placement of placements) {
      const existing = await tx.userRating.findUnique({ where: { userId: placement.userId } });
      const prev = existing ?? defaultRatingSnapshot;
      players.push({ ...prev, userId: placement.userId, place: placement.place });
    }

    const changes = [];
    for (const next of nextRatings(players)) {
      await tx.userRating.upsert({
        where: { userId: next.userId },
        create: next,
        update: next,
      });
      changes.push({ userId: next.userId, before: players.find((p) => p.userId === next.userId)!.rating, after: next.rating });
    }
    return changes;
  });
}
