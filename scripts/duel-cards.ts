// Writes data/duel/marvel-cards.json: a Duel card for every Marvel card in data/cards.json, base and packs
// alike, so a Duel can be dealt from the whole library. Each card keeps its own id, level, color and Avengers
// marks, which stand as its badges, and is built from one of the box's cards of that level and color
// (data/duel/cards.json): a marked card from the box's badged ones, an unmarked card from the rest, taken in
// turn so each level's mix of points, powers and wild cards follows the box.
//
// Its value stays the box card's: the same points plus badges (a badge it has more or fewer than the box card
// is a point less or more), the same power, and a cost with the same number of tokens and Time Stones. The first
// card on a box card keeps its cost exactly; the next ones get the same cost in other colors, or one token moved
// to another color, so no two cards of a level and color cost the same. The card's own color keeps its place.
// Cards already in the file are kept as they are, so a saved game never finds a card changed under it.
//
//   pnpm duel:cards   add the cards missing from the file
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import marvelCards from "@/data/cards.json";
import duelCards from "@/data/duel/cards.json";
import type { DuelCard, Stone, TokenColor } from "@/lib/duel/types";
import { createRng, shuffle } from "@/lib/engine/rng";
import { STONES, type Card, type CardLevel } from "@/lib/engine/types";

const FILE = "data/duel/marvel-cards.json";
const META = {
  what: "A Duel card for every Marvel card, so a Duel is dealt from the whole library, packs included. Made by scripts/duel-cards.ts from the box's cards; a card's stats may be tuned here by hand.",
  ids: "The Marvel card's own id. Saved games refer to cards by id, so never remove one; a card pulled from data/cards.json still resolves here.",
};
/** How many costs to try for a card before it takes a repeat. */
const TRIES = 60;

type Cost = DuelCard["cost"];
const box = (duelCards as { cards: DuelCard[] }).cards;
const marvel = (marvelCards as { cards: Card[] }).cards;
const have: DuelCard[] = existsSync(FILE) ? (JSON.parse(readFileSync(FILE, "utf8")) as { cards: DuelCard[] }).cards : [];
const known = new Set(have.map((c) => c.id));

const costKey = (level: number, bonus: DuelCard["bonus"], cost: Cost) =>
  `${level}|${bonus}|${(["time", ...STONES] as TokenColor[]).map((t) => cost[t] ?? 0).join(",")}`;
/** Costs already taken, by level, color and cost: no two cards of a level and color cost the same. */
const taken = new Set(have.map((c) => costKey(c.level, c.bonus, c.cost)));

/** The same cost in other colors: the stones other than the card's own swapped round. */
function recolor(cost: Cost, own: Stone | null, rng: () => number): Cost {
  const free = STONES.filter((s) => s !== own);
  const order = shuffle(free, rng);
  const to = new Map(free.map((s, i) => [s, order[i]] as const));
  const out: Cost = {};
  for (const [t, n] of Object.entries(cost) as [TokenColor, number][]) out[(to.get(t as Stone) ?? t) as TokenColor] = n;
  return out;
}

/** One token moved from one of the other colors to another, never past the most the box card asks of one color, or 2. */
function shift(cost: Cost, own: Stone | null, rng: () => number): Cost | null {
  const most = Math.max(2, ...STONES.map((s) => cost[s] ?? 0));
  const used = STONES.filter((s) => s !== own && (cost[s] ?? 0) > 0);
  // A cost of one color stays one color: it moves by recoloring.
  if (used.length < 2) return null;
  const from = shuffle(used, rng)[0];
  const to = shuffle(STONES.filter((s) => s !== own && s !== from && (cost[s] ?? 0) < most), rng)[0];
  if (!to) return null;
  const out: Cost = { ...cost, [from]: cost[from]! - 1, [to]: (cost[to] ?? 0) + 1 };
  if (out[from] === 0) delete out[from];
  return out;
}

/** The box card's cost first, then other colors, then a token moved, until one no card of this level and color has. */
function freshCost(card: Card, t: DuelCard): Cost {
  const own = t.bonus === "wild" || t.bonus === null ? null : t.bonus;
  const rng = createRng(`duel-cards:${card.id}`);
  for (let i = 0; i < TRIES; i++) {
    let cost: Cost = i === 0 ? t.cost : recolor(t.cost, own, rng);
    if (i > TRIES / 4) cost = shift(cost, own, rng) ?? cost;
    if (!taken.has(costKey(t.level, t.bonus, cost))) return cost;
  }
  return t.cost;
}

const byValue = <T extends { points: number }>(crowns: (c: T) => number) => (a: T, b: T) => crowns(b) - crowns(a) || b.points - a.points;
const added: DuelCard[] = [];
for (const level of [1, 2, 3] as CardLevel[]) {
  const cards = marvel.filter((c) => c.level === level);
  const templates = box.filter((c) => c.level === level);
  // How many of this level are wild or without a bonus in the box, scaled to the library; the same cards every run.
  const share = (kind: DuelCard["bonus"]) => Math.round((cards.length * templates.filter((t) => t.bonus === kind).length) / templates.length);
  const picked = shuffle(cards.map((c) => c.id), createRng(`duel-cards:${level}`));
  const none = new Set(picked.slice(0, share(null)));
  const wild = new Set(picked.slice(share(null), share(null) + share("wild")));
  const familyOf = (c: Card) => (none.has(c.id) ? "null" : wild.has(c.id) ? "wild" : c.bonus);

  const families = new Map<string, Card[]>();
  for (const c of cards) families.set(familyOf(c), [...(families.get(familyOf(c)) ?? []), c]);
  for (const [key, members] of families) {
    const fits = templates.filter((t) => String(t.bonus) === key).sort(byValue((t) => t.crowns));
    // Only an Avenger wears badges: the marked cards take the box's badged cards, the rest the others, round and round.
    for (const marked of [true, false]) {
      const mine = members.filter((c) => c.tags > 0 === marked).sort(byValue((c) => c.tags));
      const pool = fits.filter((t) => t.crowns > 0 === marked);
      const from = pool.length > 0 ? pool : fits;
      mine.forEach((c, i) => {
        if (known.has(c.id)) return;
        const t = from[i % from.length];
        const cost = freshCost(c, t);
        taken.add(costKey(level, t.bonus, cost));
        // A badge is worth a point: one fewer than the box card is a point more, one more is a point less.
        const points = Math.max(0, t.points + t.crowns - c.tags);
        added.push({ id: c.id, level, points, crowns: c.tags, bonus: t.bonus, bonusCount: t.bonusCount, ability: t.ability, cost });
      });
    }
  }
}

const all = [...have, ...added].sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));
writeFileSync(FILE, `${JSON.stringify({ _meta: META, cards: all }, null, 2)}\n`);
console.log(`${added.length} cards added, ${all.length} in ${FILE}`);
for (const level of [1, 2, 3]) {
  const mine = all.filter((c) => c.level === level);
  const count = (f: (c: DuelCard) => boolean) => mine.filter(f).length;
  const costs = new Set(mine.map((c) => costKey(c.level, c.bonus, c.cost))).size;
  console.log(`  level ${level}: ${mine.length} cards, ${costs} different costs, ${count((c) => c.bonus === "wild")} wild, ${count((c) => c.bonus === null)} no bonus, ${count((c) => c.ability !== null && c.ability !== "wild")} with a power, ${mine.reduce((n, c) => n + c.crowns, 0)} badges, ${mine.reduce((n, c) => n + c.points, 0)} points`);
}
