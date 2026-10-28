// Writes data/duel/marvel-cards.json: a Duel card for every Marvel card in data/cards.json, base and packs
// alike, so a Duel can be dealt from the whole library. Each card keeps its own id, level, color and Avengers
// marks, which stand as its badges, and takes its cost, points and power from the box's cards of that level and
// color (data/duel/cards.json): a marked card from the box's badged ones, an unmarked card from the rest, cycled
// so each level's mix matches the box. A share of each level become wild or no-bonus cards, as the box has
// them. Cards already in the file are kept as they are, so a saved game never finds a card changed under it.
//
//   pnpm duel:cards   add the cards missing from the file
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import marvelCards from "@/data/cards.json";
import duelCards from "@/data/duel/cards.json";
import type { DuelCard, Stone } from "@/lib/duel/types";
import { createRng, shuffle } from "@/lib/engine/rng";
import type { Card, CardLevel } from "@/lib/engine/types";

const FILE = "data/duel/marvel-cards.json";
const META = {
  what: "A Duel card for every Marvel card, so a Duel is dealt from the whole library, packs included. Made by scripts/duel-cards.ts from the box's cards; a card's stats may be tuned here by hand.",
  ids: "The Marvel card's own id. Saved games refer to cards by id, so never remove one; a card pulled from data/cards.json still resolves here.",
};

const box = (duelCards as { cards: DuelCard[] }).cards;
const marvel = (marvelCards as { cards: Card[] }).cards;
const have: DuelCard[] = existsSync(FILE) ? (JSON.parse(readFileSync(FILE, "utf8")) as { cards: DuelCard[] }).cards : [];
const known = new Set(have.map((c) => c.id));

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
  const kindOf = (id: string): Stone | "wild" | null | "color" => (none.has(id) ? null : wild.has(id) ? "wild" : "color");

  const families = new Map<string, Card[]>();
  for (const c of cards) {
    const kind = kindOf(c.id);
    const key = kind === "color" ? c.bonus : String(kind);
    families.set(key, [...(families.get(key) ?? []), c]);
  }
  for (const [key, members] of families) {
    const fits = templates.filter((t) => (key === "null" ? t.bonus === null : key === "wild" ? t.bonus === "wild" : t.bonus === key)).sort(byValue((t) => t.crowns));
    // Only an Avenger wears badges: the marked cards take the box's badged templates, the rest the others, round and round.
    for (const marked of [true, false]) {
      const mine = members.filter((c) => c.tags > 0 === marked).sort(byValue((c) => c.tags));
      const pool = fits.filter((t) => t.crowns > 0 === marked);
      const from = pool.length > 0 ? pool : fits;
      mine.forEach((c, i) => {
        if (known.has(c.id)) return;
        const t = from[i % from.length];
        added.push({ id: c.id, level, points: t.points, crowns: c.tags, bonus: t.bonus, bonusCount: t.bonusCount, ability: t.ability, cost: { ...t.cost } });
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
  console.log(`  level ${level}: ${mine.length} cards, ${count((c) => c.bonus === "wild")} wild, ${count((c) => c.bonus === null)} no bonus, ${count((c) => c.ability !== null && c.ability !== "wild")} with a power, ${mine.reduce((n, c) => n + c.crowns, 0)} badges, ${mine.reduce((n, c) => n + c.points, 0)} points`);
}
