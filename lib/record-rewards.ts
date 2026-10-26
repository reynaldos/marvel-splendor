import { cardFrameTier } from "@/lib/card-level";
import { prisma } from "@/lib/db";
import { botDifficultyForSeat } from "@/lib/engine/types";
import { rankPlayers, type GameRewards } from "@/lib/game-record";
import { isDuel, rankable, type AnyState } from "@/lib/game-rules";
import { Prisma } from "@/lib/generated/prisma/client";
import type { UserStatsSnapshot } from "@/lib/record-stats";
import type { CardCountChange } from "@/lib/save-collection";
import { cardLevelXp, gameXp } from "@/lib/xp";

export interface RewardSources {
  stats: Array<{ userId: string; prev: UserStatsSnapshot; next: UserStatsSnapshot }>;
  rating: Array<{ userId: string; before: number; after: number }>;
  coins: Map<string, number>;
  /** Each player's account XP before this game. */
  xpBefore: Map<string, number>;
  /** What this game gave each player, from `gameXpByUser`. */
  gameXp: Map<string, number>;
  cards: CardCountChange[];
}

/** XP the game gave each signed-in human, from how their seat finished. A guest or stand-in bot counts as a human opponent. */
export function gameXpByUser(state: AnyState, players: Array<{ seat: number; userId: string | null; isBot: boolean }>): Map<string, number> {
  const record = rankable(state);
  const ranked = rankPlayers(record, []);
  const xp = new Map<string, number>();
  for (const p of players) {
    if (p.isBot || !p.userId) continue;
    const seat = record.players[p.seat];
    // In Duel the crowns stand as badges, the target is its 20 points, and there are no tiles or Time Stone.
    const duel = isDuel(state);
    xp.set(
      p.userId,
      gameXp({
        place: ranked.find((r) => r.seat === p.seat)!.place,
        opponents: players.filter((o) => o.seat !== p.seat).map((o) => (o.isBot ? botDifficultyForSeat(state.settings, o.seat) : "human")),
        pointsOverTarget: Math.max(0, seat.points - (duel ? 20 : state.settings.targetPoints)),
        cards: seat.cards.length,
        badges: seat.tags,
        heldAvengersTile: !duel && state.avengersHolder === p.seat,
        locations: duel ? 0 : state.players[p.seat].locations.length,
        timeStone: !duel && state.players[p.seat].tokens.time > 0,
      }),
    );
  }
  return xp;
}

/** One player's rewards, put together from what each recorder said it changed. Null when their stats weren't recorded. */
export function buildGameRewards(userId: string, from: RewardSources): GameRewards | null {
  const stats = from.stats.find((s) => s.userId === userId);
  if (!stats) return null;

  const cards = from.cards.filter((c) => c.userId === userId);
  const xpBefore = from.xpBefore.get(userId) ?? 0;
  const xpAfter = xpBefore + (from.gameXp.get(userId) ?? 0) + cardLevelXp(cards.map((c) => ({ cardId: c.cardId, times: c.after }))) - cardLevelXp(cards.map((c) => ({ cardId: c.cardId, times: c.before })));
  const rating = from.rating.find((r) => r.userId === userId);

  return {
    ...(rating ? { rating: { before: rating.before, after: rating.after } } : {}),
    coins: from.coins.get(userId) ?? 0,
    xp: { before: xpBefore, after: xpAfter },
    cardLevelUps: cards
      .map((c) => ({ cardId: c.cardId, from: c.before === 0 ? null : cardFrameTier(c.cardId, c.before), to: cardFrameTier(c.cardId, c.after) }))
      .filter((c) => c.from !== c.to),
  };
}

/** Saves each human player's rewards on their seat, so the results can show them any time. */
export async function recordGameRewards(
  gameId: string,
  players: Array<{ seat: number; userId: string | null; isBot: boolean }>,
  from: RewardSources,
): Promise<void> {
  await Promise.all(
    players
      .filter((p) => !p.isBot && p.userId)
      .map((p) => ({ seat: p.seat, rewards: buildGameRewards(p.userId!, from) }))
      .filter((p) => p.rewards)
      .map((p) =>
        prisma.gamePlayer.update({
          where: { gameId_seat: { gameId, seat: p.seat } },
          data: { rewards: p.rewards as unknown as Prisma.InputJsonValue },
        }),
      ),
  );
}
