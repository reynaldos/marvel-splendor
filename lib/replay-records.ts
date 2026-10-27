/**
 * Replays every finished game in the order it ended and works out what the
 * records should say: each player's stats, rank, coins, collection, and the
 * rewards on each seat, which their XP is read from. The live game records
 * each of these as it finishes; this gives the same answer from the games
 * alone, so the records can be set right after a game is deleted or a formula
 * changes.
 */
import { BOT_COINS_DAILY_CAP, coinsForOutcome, isTurnPrimary, opponentTierFor } from "@/lib/coins";
import { cardsRecruited } from "@/lib/collection";
import { prisma } from "@/lib/db";
import type { GameSettings } from "@/lib/engine/types";
import { rankPlayers, type GameRewards } from "@/lib/game-record";
import { isDuel, rankable, type AnyMove, type AnyState } from "@/lib/game-rules";
import { Prisma } from "@/lib/generated/prisma/client";
import { defaultRatingSnapshot, nextRatings, type RatingSnapshot } from "@/lib/rating";
import { buildGameRewards, gameXpByUser, type RewardSources } from "@/lib/record-rewards";
import { defaultUserStatsSnapshot, nextUserStats, type UserStatsSnapshot } from "@/lib/record-stats";

export interface ReplayGame {
  id: string;
  mode: "VS_BOT" | "MULTIPLAYER";
  /** When it ended. */
  updatedAt: Date;
  state: AnyState;
  players: Array<{ seat: number; isBot: boolean; userId: string | null }>;
  moves: Array<{ seat: number; move: AnyMove }>;
}

export interface Records {
  stats: Map<string, UserStatsSnapshot>;
  ratings: Map<string, RatingSnapshot>;
  /** The ledger's game awards, in order. */
  coins: Array<{ userId: string; delta: number; reason: string; gameId: string; createdAt: Date }>;
  /** Each player's cards: how many times, and when first found. */
  collections: Map<string, Map<string, { times: number; firstFoundAt: Date }>>;
  rewards: Array<{ gameId: string; seat: number; rewards: GameRewards }>;
}

/** What the records say after `games`, each as the live game would have recorded it at the time. */
export function replayRecords(games: ReplayGame[]): Records {
  const records: Records = { stats: new Map(), ratings: new Map(), coins: [], collections: new Map(), rewards: [] };
  const botCoinsByDay = new Map<string, number>();
  const xp = new Map<string, number>();

  for (const game of games) {
    const humans = game.players.filter((p) => !p.isBot && p.userId);
    if (humans.length === 0) continue;
    const { state } = game;
    const record = rankable(state);
    const from: RewardSources = { stats: [], rating: [], coins: new Map(), xpBefore: new Map(), gameXp: gameXpByUser(state, game.players), cards: [] };

    // Stats and coins, as recordGameStats and recordGameCoins do them: the daily cap on bot games runs per UTC day.
    for (const p of humans) {
      const seat = record.players[p.seat];
      const isWinner = record.winnerSeat === p.seat || (record.sharedWinners?.includes(p.seat) ?? false);
      const turns = game.moves.filter((m) => m.seat === p.seat && isTurnPrimary(m.move.type)).length;
      const prev = records.stats.get(p.userId!) ?? defaultUserStatsSnapshot;
      const next = nextUserStats(
        prev,
        {
          userId: p.userId!,
          isWinner,
          points: seat.points,
          turns,
          wonAvengersTile: !isDuel(state) && state.avengersHolder === p.seat,
          locationsClaimed: isDuel(state) ? 0 : state.players[p.seat].locations.length,
        },
        game.mode,
      );
      records.stats.set(p.userId!, next);
      from.stats.push({ userId: p.userId!, prev, next });

      const tier = opponentTierFor(state.settings as GameSettings, p.seat, game.players);
      let amount = coinsForOutcome(tier, isWinner, turns);
      if (tier !== "human" && amount > 0) {
        const day = `${p.userId}:${game.updatedAt.toISOString().slice(0, 10)}`;
        const today = botCoinsByDay.get(day) ?? 0;
        amount = Math.max(0, Math.min(amount, BOT_COINS_DAILY_CAP - today));
        botCoinsByDay.set(day, today + amount);
      }
      if (amount > 0) {
        from.coins.set(p.userId!, amount);
        records.coins.push({ userId: p.userId!, delta: amount, reason: `game:${tier}:${isWinner ? "win" : "loss"}`, gameId: game.id, createdAt: game.updatedAt });
      }
    }

    // Rank, as recordGameRating does it: multiplayer with 2+ signed-in humans.
    if (game.mode === "MULTIPLAYER" && humans.length >= 2) {
      const ranked = rankPlayers(record, []);
      const players = humans.map((p) => ({ ...(records.ratings.get(p.userId!) ?? defaultRatingSnapshot), userId: p.userId!, place: ranked.find((r) => r.seat === p.seat)!.place }));
      for (const { userId, ...next } of nextRatings(players)) {
        from.rating.push({ userId, before: players.find((p) => p.userId === userId)!.rating, after: next.rating });
        records.ratings.set(userId, next);
      }
    }

    // Collections, as saveCollectedCards does it.
    const recruited = cardsRecruited(game.moves);
    for (const p of humans) {
      const mine = records.collections.get(p.userId!) ?? new Map<string, { times: number; firstFoundAt: Date }>();
      from.xpBefore.set(p.userId!, xp.get(p.userId!) ?? 0);
      for (const [cardId, times] of recruited.get(p.seat) ?? []) {
        const before = mine.get(cardId)?.times ?? 0;
        mine.set(cardId, { times: before + times, firstFoundAt: mine.get(cardId)?.firstFoundAt ?? game.updatedAt });
        from.cards.push({ userId: p.userId!, cardId, before, after: before + times });
      }
      records.collections.set(p.userId!, mine);
    }

    for (const p of humans) {
      const rewards = buildGameRewards(p.userId!, from)!;
      xp.set(p.userId!, rewards.xp.after);
      records.rewards.push({ gameId: game.id, seat: p.seat, rewards });
    }
  }
  return records;
}

/** Every finished game as the replay reads it, oldest first. */
export async function loadFinishedGames(): Promise<ReplayGame[]> {
  const games = await prisma.game.findMany({
    where: { status: "FINISHED" },
    orderBy: { updatedAt: "asc" },
    select: {
      id: true,
      mode: true,
      updatedAt: true,
      state: true,
      players: { select: { seat: true, isBot: true, userId: true } },
      moves: { orderBy: { ordinal: "asc" }, select: { seat: true, payload: true } },
    },
  });
  return games.map((g) => ({ ...g, state: g.state as unknown as AnyState, moves: g.moves.map((m) => ({ seat: m.seat, move: m.payload as unknown as AnyMove })) }));
}

/**
 * Sets every record to what the finished games say, all or nothing. Daily bonuses and purchases stay in the
 * coin ledger; only the game awards are rebuilt. Admin only, and rare: it rewrites everyone's records.
 */
export async function rebuildRecords(): Promise<void> {
  const records = replayRecords(await loadFinishedGames());
  const cards = [...records.collections].flatMap(([userId, mine]) => [...mine].map(([cardId, c]) => ({ userId, cardId, times: c.times, firstFoundAt: c.firstFoundAt })));
  await prisma.$transaction(
    async (tx) => {
      await tx.userStats.deleteMany({ where: { userId: { notIn: [...records.stats.keys()] } } });
      for (const [userId, next] of records.stats) await tx.userStats.upsert({ where: { userId }, create: { userId, ...next }, update: next });
      await tx.userRating.deleteMany({ where: { userId: { notIn: [...records.ratings.keys()] } } });
      for (const [userId, next] of records.ratings) await tx.userRating.upsert({ where: { userId }, create: { userId, ...next }, update: next });

      await tx.coinTransaction.deleteMany({ where: { reason: { startsWith: "game:" } } });
      await tx.coinTransaction.createMany({ data: records.coins });
      const totals = await tx.coinTransaction.groupBy({ by: ["userId"], _sum: { delta: true } });
      await tx.userCoins.deleteMany({ where: { userId: { notIn: totals.map((t) => t.userId) } } });
      for (const { userId, _sum } of totals) await tx.userCoins.upsert({ where: { userId }, create: { userId, balance: _sum.delta ?? 0 }, update: { balance: _sum.delta ?? 0 } });

      await tx.collectedCard.deleteMany({});
      await tx.collectedCard.createMany({ data: cards });

      // One statement for every seat's rewards, however many games there are.
      await tx.gamePlayer.updateMany({ where: { game: { status: "FINISHED" } }, data: { rewards: Prisma.DbNull } });
      if (records.rewards.length > 0) {
        await tx.$executeRaw`
          update "GamePlayer" g set "rewards" = r.rewards::jsonb
          from unnest(${records.rewards.map((r) => r.gameId)}::text[], ${records.rewards.map((r) => r.seat)}::int[], ${records.rewards.map((r) => JSON.stringify(r.rewards))}::text[]) as r("gameId", seat, rewards)
          where g."gameId" = r."gameId" and g.seat = r.seat`;
      }
    },
    { timeout: 120_000, maxWait: 10_000 },
  );
}
