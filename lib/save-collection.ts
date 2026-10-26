import { cardsRecruited } from "@/lib/collection";
import { prisma } from "@/lib/db";
import type { AnyMove } from "@/lib/game-rules";
import { Prisma } from "@/lib/generated/prisma/client";

export interface CardCountChange {
  userId: string;
  cardId: string;
  before: number;
  after: number;
}

/**
 * Adds the cards each person recruited in a game to their collection, and says
 * how each card's count changed. Call it once, when the game has been played
 * to the end; an abandoned game adds nothing.
 */
export async function saveCollectedCards(
  gameId: string,
  players: Array<{ seat: number; userId: string | null; isBot: boolean }>,
): Promise<CardCountChange[]> {
  const people = players.filter((p) => !p.isBot && p.userId);
  if (people.length === 0) return [];

  const moves = await prisma.move.findMany({
    where: { gameId },
    orderBy: { ordinal: "asc" },
    select: { seat: true, payload: true },
  });
  const recruited = cardsRecruited(moves.map((m) => ({ seat: m.seat, move: m.payload as unknown as AnyMove })));

  const found = people.flatMap(({ seat, userId }) =>
    [...(recruited.get(seat) ?? [])].map(([cardId, times]) => ({ userId: userId!, cardId, times })),
  );
  if (found.length === 0) return [];

  const had = await prisma.collectedCard.findMany({
    where: { OR: found.map(({ userId, cardId }) => ({ userId, cardId })) },
    select: { userId: true, cardId: true, times: true },
  });
  await writeCollected(found, "add");
  return found.map(({ userId, cardId, times }) => {
    const before = had.find((c) => c.userId === userId && c.cardId === cardId)?.times ?? 0;
    return { userId, cardId, before, after: before + times };
  });
}

export interface Collected {
  userId: string;
  cardId: string;
  times: number;
  /** When the card was first found; left as it is for a card the player already has, when adding. */
  firstFoundAt?: Date;
}

/**
 * Writes cards to collections in one statement, so it is all or nothing and
 * takes one trip to the database however many cards there are. "add" adds to
 * the count a player has; "set" replaces it.
 */
export async function writeCollected(cards: Collected[], how: "add" | "set"): Promise<void> {
  if (cards.length === 0) return;
  const now = new Date();
  const rows = Prisma.sql`
    select * from unnest(
      ${cards.map((c) => c.userId)}::text[],
      ${cards.map((c) => c.cardId)}::text[],
      ${cards.map((c) => c.times)}::int[],
      ${cards.map((c) => c.firstFoundAt ?? now)}::timestamp[]
    )`;
  const onConflict =
    how === "add"
      ? Prisma.sql`"times" = "CollectedCard"."times" + excluded."times"`
      : Prisma.sql`"times" = excluded."times", "firstFoundAt" = excluded."firstFoundAt"`;
  await prisma.$executeRaw`
    insert into "CollectedCard" ("userId", "cardId", "times", "firstFoundAt") ${rows}
    on conflict ("userId", "cardId") do update set ${onConflict}`;
}
