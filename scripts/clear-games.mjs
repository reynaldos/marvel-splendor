// Deletes every game and everything that belongs to a game: its moves,
// seats and chat messages. Users and their stats are kept.
//
//   pnpm games:clear          show what would be deleted (changes nothing)
//   pnpm games:clear --yes    delete it — this cannot be undone
//
// Runs against DATABASE_URL from .env.
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env first.");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

const [counts] = await sql`
  select
    (select count(*)::int from "Game") as games,
    (select count(*)::int from "Move") as moves,
    (select count(*)::int from "GamePlayer") as seats,
    (select count(*)::int from "ChatMessage") as messages`;
const byStatus = await sql`select status, count(*)::int as games from "Game" group by status order by status`;

console.log(`Database: ${new URL(process.env.DATABASE_URL).hostname}`);
console.table(byStatus);
console.log(
  `${counts.games} games, ${counts.moves} moves, ${counts.seats} seats, ${counts.messages} chat messages`,
);

if (!process.argv.includes("--yes")) {
  console.log("\nNothing was deleted. Run again with --yes to delete all of the above.");
  process.exit(0);
}

// Moves, seats and messages go with their game (ON DELETE CASCADE).
await sql`delete from "Game"`;
const [left] = await sql`select count(*)::int as games, (select count(*)::int from "Move") as moves from "Game"`;
console.log(`\nDeleted. Remaining: ${left.games} games, ${left.moves} moves.`);
