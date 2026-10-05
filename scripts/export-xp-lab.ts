// Builds docs/xp-lab.html: every finished game's XP factors for each player, in a page that
// recounts everyone's XP, level and frame live as the weights, level curve and tiers are changed.
// Open the file in a browser. Reads the database only.
//
//   pnpm xp:lab
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";

import { cardsRecruited } from "@/lib/collection";
import { prisma } from "@/lib/db";
import { CARD_BY_ID } from "@/lib/engine/data";
import { botDifficultyForSeat, type GameState, type Move } from "@/lib/engine/types";
import { FRAME_EFFECT, FRAME_STYLE, FRAME_TIER_NAMES } from "@/lib/frame-tier";
import { rankPlayers } from "@/lib/game-record";
import { accountXpByUser } from "@/lib/load-xp";
import progression from "@/lib/progression.json";

/** Each tier's frame style with the theme's colour tokens resolved, so the page needs no app CSS. */
function frameStyles() {
  const css = readFileSync("node_modules/tailwindcss/theme.css", "utf8") + readFileSync("app/globals.css", "utf8");
  const colors = new Map([...css.matchAll(/--color-([a-z]+-?\d*):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  const resolve = (v: unknown) => (typeof v === "string" ? v.replace(/var\(--color-([a-z]+-?\d*)\)/g, (_, n) => colors.get(n) ?? _) : v);
  return Object.fromEntries(
    FRAME_TIER_NAMES.map((t) => [
      t,
      {
        vars: Object.fromEntries(Object.entries(FRAME_STYLE[t] as Record<string, unknown>).filter(([, v]) => v).map(([k, v]) => [k, resolve(v)])),
        effect: FRAME_EFFECT[t] ?? "",
      },
    ]),
  );
}

async function main() {
  const games = await prisma.game.findMany({
    where: { status: "FINISHED" },
    orderBy: { updatedAt: "asc" },
    select: {
      id: true,
      mode: true,
      updatedAt: true,
      state: true,
      players: { select: { seat: true, isBot: true, userId: true, user: { select: { username: true } } } },
      moves: { orderBy: { ordinal: "asc" }, select: { seat: true, payload: true } },
    },
  });
  const collections = new Map<string, Map<string, number>>();
  const users = new Map<string, { name: string; games: unknown[] }>();
  for (const game of games) {
    const state = game.state as unknown as GameState;
    const ranked = rankPlayers(state, []);
    const recruited = cardsRecruited(game.moves.map((m) => ({ seat: m.seat, move: m.payload as unknown as Move })));
    for (const p of game.players) {
      if (p.isBot || !p.userId) continue;
      const seat = state.players[p.seat];
      const mine = collections.get(p.userId) ?? new Map<string, number>();
      // Each card recruited this game as [card level, times before, times after], so the page can climb any ladder.
      const recruits: Array<[number, number, number]> = [];
      for (const [cardId, times] of recruited.get(p.seat) ?? []) {
        const before = mine.get(cardId) ?? 0;
        mine.set(cardId, before + times);
        recruits.push([CARD_BY_ID.get(cardId)?.level ?? 2, before, before + times]);
      }
      collections.set(p.userId, mine);
      const u = users.get(p.userId) ?? { name: p.user!.username, games: [] };
      u.games.push({
        when: game.updatedAt.toISOString().slice(0, 10),
        mode: game.mode,
        place: ranked.find((r) => r.seat === p.seat)!.place,
        opponents: game.players.filter((o) => o.seat !== p.seat).map((o) => (o.isBot ? botDifficultyForSeat(state.settings, o.seat) : "human")),
        points: seat.points,
        target: state.settings.targetPoints,
        cards: seat.cards.length,
        badges: seat.tags,
        tile: state.avengersHolder === p.seat,
        locations: seat.locations.length,
        timeStone: seat.tokens.time > 0,
        recruits,
      });
      users.set(p.userId, u);
    }
  }
  const saved = await accountXpByUser([...users.keys()]);
  const data = [...users.entries()].map(([id, u]) => ({ name: u.name, saved: saved.get(id) ?? 0, games: u.games }));

  const safe = (v: unknown) => JSON.stringify(v).replaceAll("</", "<\\/");
  const page = readFileSync("scripts/xp-lab.html", "utf8")
    .replace("__FRAMES__", safe(frameStyles()))
    .replace("__DATA__", safe(data))
    .replace("__CONFIG__", safe(progression))
    .replace("__EXPORTED__", new Date().toISOString().slice(0, 10));
  writeFileSync(
    "docs/xp-lab.html",
    `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n</head>\n<body>\n${page}\n</body>\n</html>\n`,
  );
  console.log(`docs/xp-lab.html: ${data.length} players, ${games.length} finished games`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
