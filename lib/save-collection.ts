import { cardsRecruited } from "@/lib/collection";
import { prisma } from "@/lib/db";
import type { Move } from "@/lib/engine/types";

/**
 * Adds the cards each person recruited in a game to their collection. Call it
 * once, when the game has been played to the end; an abandoned game adds nothing.
 */
export async function saveCollectedCards(
  gameId: string,
  players: Array<{ seat: number; userId: string | null; isBot: boolean }>,
): Promise<void> {
  const people = players.filter((p) => !p.isBot && p.userId);
  if (people.length === 0) return;

  const moves = await prisma.move.findMany({
    where: { gameId },
    orderBy: { ordinal: "asc" },
    select: { seat: true, payload: true },
  });
  const recruited = cardsRecruited(moves.map((m) => ({ seat: m.seat, move: m.payload as unknown as Move })));

  const found = people.flatMap(({ seat, userId }) =>
    [...(recruited.get(seat) ?? [])].map(([cardId, times]) => ({ userId: userId!, cardId, times })),
  );
  if (found.length === 0) return;

  // Together or not at all, so a game is never half counted.
  await prisma.$transaction(
    found.map(({ userId, cardId, times }) =>
      prisma.collectedCard.upsert({
        where: { userId_cardId: { userId, cardId } },
        create: { userId, cardId, times },
        update: { times: { increment: times } },
      }),
    ),
  );
}
