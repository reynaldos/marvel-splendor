/**
 * What each card's character looks like, in words, read off the card art by
 * OpenAI's vision model. Fed to the image models that take names, so they
 * draw the right costume and not a guess. Costs a little per card.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import OpenAI from "openai";

import type { Card } from "./engine/types";
import type { CastMember, SquadOptions } from "./squad-settings";

/** Looks already read, by card id, kept in a file so a card is read once ever, not once per server run. */
const LOOKS_FILE = path.join(process.cwd(), "data", "card-looks.json");
type Looks = Record<string, { name: string; look: string }>;
let looksFile: Promise<Looks> | undefined;
const loadLooks = () =>
  (looksFile ??= readFile(LOOKS_FILE, "utf8")
    .then((s) => JSON.parse(s) as Looks)
    .catch((): Looks => ({})));

const ASK =
  "Write one precise visual description of the character on this card for an illustrator who has never seen them: " +
  "headgear or mask, hair, face or faceplate, skin or metal, build, every costume piece with its colours, cape, gloves, boots, belt, emblems, " +
  "signature props or weapons, and any energy effects. 60 to 90 words. Describe only what is drawn. Do not name the character.";

// One card per call: asked for several at once, the model now and then skips one.
async function describeCard(client: OpenAI, card: Card): Promise<string> {
  const image_url = `data:image/png;base64,${(await readFile(path.join(process.cwd(), "public", card.image!))).toString("base64")}`;
  const result = await client.responses.create({
    model: "gpt-5.4-mini",
    input: [{ role: "user", content: [{ type: "input_text", text: ASK }, { type: "input_image", detail: "high", image_url }] }],
  });
  const look = result.output_text.trim();
  if (!look) throw new Error(`${card.name}'s card could not be read.`);
  return look;
}

/** The cast for the prompt: names always, looks only when asked for. */
export async function castFor(cards: readonly Card[], opts: SquadOptions): Promise<CastMember[]> {
  if (!opts.looks) return cards.map((c) => ({ name: c.name }));
  if (!process.env.OPENAI_API_KEY) throw new Error("Add OPENAI_API_KEY to .env to read the cards, or turn the looks off.");
  const looks = await describeCards(cards);
  return cards.map((c, i) => ({ name: c.name, look: looks[i] || undefined }));
}

/** One description per card, in the cards' order. */
export async function describeCards(cards: readonly Card[]): Promise<string[]> {
  const known = await loadLooks();
  const todo = cards.filter((c) => c.image && !known[c.id]);
  if (todo.length > 0) {
    const client = new OpenAI();
    const looks = await Promise.all(todo.map((c) => describeCard(client, c)));
    todo.forEach((c, i) => (known[c.id] = { name: c.name, look: looks[i] }));
    const sorted = Object.fromEntries(Object.keys(known).sort().map((id) => [id, known[id]]));
    await writeFile(LOOKS_FILE, JSON.stringify(sorted, null, 2) + "\n");
  }
  return cards.map((c) => known[c.id]?.look ?? "");
}
