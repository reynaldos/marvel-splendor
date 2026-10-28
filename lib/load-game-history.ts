import { botAvatarKeys } from "@/lib/avatars";
import { careerStats, type CareerStats } from "@/lib/career-stats";
import { prisma } from "@/lib/db";
import { rankable, type AnyState } from "@/lib/game-rules";
import { gameRecord, type GameRecord, type GameRewards } from "@/lib/game-record";
import { botName } from "@/lib/lobby-rules";
import { publicAvatarUrl } from "@/lib/r2";

/**
 * A player's finished games, latest first, and the stats they add up to.
 *
 * ponytail: reads every finished game the player was in, and clearing games
 * clears both. Keep running totals on UserStats if either ever matters.
 */
export async function loadGameHistory(userId: string): Promise<{
  games: GameRecord[];
  career: CareerStats;
  /** The same, from games against at least one other person: beating bots sets no records. */
  records: CareerStats;
}> {
  const seats = await prisma.gamePlayer.findMany({
    where: { userId, game: { status: "FINISHED" } },
    orderBy: { game: { updatedAt: "desc" } },
    select: {
      seat: true,
      game: {
        select: {
          id: true,
          seed: true,
          updatedAt: true,
          state: true,
          players: {
            select: {
              seat: true,
              isBot: true,
              guestName: true,
              rewards: true,
              user: { select: { username: true, avatarKey: true } },
            },
          },
        },
      },
    },
  });

  const played = seats.flatMap(({ seat, game }) => {
    const state = game.state as unknown as AnyState;
    if (!state.players?.[seat]) return [];
    const mine = rankable(state).players[seat];
    const botAvatars = botAvatarKeys(game.seed, game.players);
    const record = gameRecord(
      {
        id: game.id,
        players: game.players,
        endedAt: game.updatedAt.getTime(),
        state,
        rewards: game.players.flatMap((p) => (p.rewards ? [[p.seat, p.rewards as unknown as GameRewards] as const] : [])),
      },
      seat,
      game.players.map((p) => ({
        seat: p.seat,
        name: p.isBot ? botName(game.players, p.seat) : (p.user?.username ?? p.guestName ?? "Player"),
        avatarUrl: publicAvatarUrl(p.isBot ? botAvatars.get(p.seat) : p.user?.avatarKey),
      })),
    );
    const againstPeople = game.players.some((p) => !p.isBot && p.seat !== seat);
    return record ? [{ record, mine, againstPeople }] : [];
  });
  const stats = (games: typeof played) =>
    careerStats(
      games.map(({ record, mine }) => ({
        cards: mine.cards,
        points: mine.points,
        tags: mine.tags,
        won: record.won,
        turns: record.rounds,
      })),
    );

  return {
    games: played.map((p) => p.record),
    career: stats(played),
    records: stats(played.filter((p) => p.againstPeople)),
  };
}
