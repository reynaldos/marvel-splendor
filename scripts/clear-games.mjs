// Deletes every game and everything that belongs to a game: its moves,
// seats and chat messages. With --stats it also sets every player's stats
// back to zero, for a fresh start. Players, and their names and pictures,
// are always kept.
//
//   pnpm games:clear          show what would be deleted (changes nothing)
//   pnpm games:clear --yes    delete the games — this cannot be undone
//   pnpm games:reset          show what a fresh start would clear (changes nothing)
//   pnpm games:reset --yes    delete the games and zero the stats — this cannot be undone
//
// Runs against DATABASE_URL from .env.
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env first.");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);
const withStats = process.argv.includes("--stats");

const [counts] = await sql`
  select
    (select count(*)::int from "Game") as games,
    (select count(*)::int from "Move") as moves,
    (select count(*)::int from "GamePlayer") as seats,
    (select count(*)::int from "ChatMessage") as messages,
    (select count(*)::int from "User") as players,
    (select count(*)::int from "UserStats" where "gamesPlayed" > 0) as "withStats"`;
const byStatus = await sql`select status, count(*)::int as games from "Game" group by status order by status`;

console.log(`Database: ${new URL(process.env.DATABASE_URL).hostname}`);
console.table(byStatus);
console.log(
  `${counts.games} games, ${counts.moves} moves, ${counts.seats} seats, ${counts.messages} chat messages`,
);
if (withStats) console.log(`${counts.withStats} of ${counts.players} players have stats to set back to zero`);

const what = withStats ? "delete all of the above and zero the stats" : "delete all of the above";
if (!process.argv.includes("--yes")) {
  console.log(`\nNothing was changed. Run again with --yes to ${what}.`);
  process.exit(0);
}

// Together or not at all. Moves, seats and messages go with their game (ON DELETE CASCADE).
await sql.transaction([
  sql`delete from "Game"`,
  ...(withStats
    ? [
        sql`update "UserStats" set
          "gamesPlayed" = 0, "wins" = 0, "vsBotWins" = 0, "bestPoints" = 0,
          "fastestWinTurns" = null, "avengersTilesWon" = 0, "locationsClaimed" = 0`,
      ]
    : []),
]);

const [left] = await sql`
  select
    (select count(*)::int from "Game") as games,
    (select count(*)::int from "Move") as moves,
    (select count(*)::int from "User") as players,
    (select count(*)::int from "UserStats" where "gamesPlayed" > 0) as "withStats"`;
console.log(`\nDone. Remaining: ${left.games} games, ${left.moves} moves.`);
if (withStats) console.log(`${left.withStats} players with stats. All ${left.players} players kept.`);
