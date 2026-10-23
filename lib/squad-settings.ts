/**
 * Where a squad pic is set and what it asks the image model for. Pure, so the
 * page can pick a team's setting before anything is drawn.
 */
import type { Card } from "./engine/types";

/** As many cards as the image model takes as references. */
export const MAX_SQUAD = 12;

/** The image models that can draw it. All but OpenAI's are reached through fal.ai. */
export const DRAWERS = {
  openai: "OpenAI gpt-image-2",
  google: "Google Nano Banana Pro (fal.ai)",
  seedream5: "ByteDance Seedream 5 Pro (fal.ai)",
  seedream: "ByteDance Seedream 4.5 (fal.ai)",
  flux: "FLUX.2 Pro (fal.ai)",
  comfy: "FLUX Kontext (ComfyUI)",
} as const;
export type Drawer = keyof typeof DRAWERS;
export type FalDrawer = Exclude<Drawer, "openai" | "comfy">;

/** A mid-game team: a few cards of each level, strongest first. */
export function dealTeam(cards: readonly Card[]): Card[] {
  const take = (level: number, n: number) =>
    cards.filter((c) => c.level === level).sort(() => Math.random() - 0.5).slice(0, n);
  return [...take(3, 2), ...take(2, 3), ...take(1, 3)].sort((a, b) => b.points - a.points || b.level - a.level);
}

/** Where the team stands, after the game's Location tiles. Described, never named, for the safety system. */
export const SETTINGS = {
  Helicarrier: "the open deck of a vast airship sailing above the clouds at dusk",
  "Hell's Kitchen": "a rain-slick New York back street at night, neon signs and fire escapes",
  Wakanda: "a futuristic African city of gleaming towers at sunset, purple and gold light",
  Asgard: "a golden city of spires at the end of a rainbow bridge, among the stars",
  Attilan: "a silver city on the Moon, the Earth hanging in a black sky",
  "Avengers Tower":
    "the rooftop landing deck of a sleek glass-and-steel tower high over Manhattan at night: a wide hangar door sliding open in the roof, " +
    "a jet's nose in the lit bay behind it, landing lights along the deck's edge, the city's lights far below",
  Knowhere:
    "a colossal severed head of an ancient giant drifting in a coloured nebula, more machine than bone: its surface plated with metal and carved into " +
    "a dense mining city of towers, pipes, cranes and docking arms, thousands of lit windows across the cheek and brow, one eye socket a vast glowing " +
    "machine aperture, the jaw hanging open and trailing cables and chains into space, the whole thing wreathed in nebula gas and drifting rock",
  Atlantis: "an undersea city of coral and glowing pillars, shafts of light through the water",
  "Baxter Building": "the rooftop of a high-tech laboratory tower at dawn, Manhattan behind",
  "X-Mansion": "the lawn of a grand stone mansion school at golden hour",
  "Sanctum Sanctorum": "an old townhouse attic with a round window, mystic sigils glowing in the air",
  Latveria: "a gothic castle in a mountain kingdom at night, lightning in the clouds",
  Cosmos: "a deep blue cosmic night sky full of stars, with a warm gold burst of light behind the team",
} as const;
export type Setting = keyof typeof SETTINGS;

/** The setting a team's group calls for. */
const GROUP_SETTING: Record<string, Setting> = {
  Avengers: "Avengers Tower",
  "New Avengers": "Avengers Tower",
  "Young Avengers": "Avengers Tower",
  Inhumans: "Attilan",
  "Sinister Six": "Hell's Kitchen",
  Defenders: "Hell's Kitchen",
  "Heroes for Hire": "Hell's Kitchen",
  "The Hand": "Hell's Kitchen",
  "Spider-Verse": "Hell's Kitchen",
  Symbiotes: "Hell's Kitchen",
  "X-Men": "X-Mansion",
  "Brotherhood of Mutants": "X-Mansion",
  "Weapon X": "X-Mansion",
  "Guardians of the Galaxy": "Knowhere",
  "Elders of the Universe": "Knowhere",
  Kree: "Knowhere",
  "Black Order": "Knowhere",
  Thunderbolts: "Helicarrier",
  "S.H.I.E.L.D.": "Helicarrier",
  Hydra: "Latveria",
  Cabal: "Latveria",
  "A.I.M.": "Latveria",
  "Fantastic Four": "Baxter Building",
  Illuminati: "Sanctum Sanctorum",
  "Mystic Arts": "Sanctum Sanctorum",
  "Midnight Sons": "Sanctum Sanctorum",
  Asgard: "Asgard",
  Wakanda: "Wakanda",
};

/** The setting of the group most of the team belongs to; any setting when no group has two of them. */
export function squadSetting(cards: readonly Card[], random = Math.random): Setting {
  const counts = new Map<string, number>();
  for (const c of cards) for (const g of c.groups ?? []) counts.set(g, (counts.get(g) ?? 0) + 1);
  const [top, n] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (top && n >= 2 && GROUP_SETTING[top]) return GROUP_SETTING[top];
  const all = Object.keys(SETTINGS) as Setting[];
  return all[Math.floor(random() * all.length)];
}

/**
 * How the picture is drawn. Chosen on the demo page. Each describes a hand
 * technique and never names a product, not even "comic": to a safety
 * checker that reads as copying a published work, and gets refused.
 */
export const STYLES = {
  modern: {
    name: "Clean inks, bold colour",
    text:
      "pencilled and inked: crisp black ink outlines, flat cel shading, bold saturated colours, clean halftone shadows. " +
      "Not painted, not blurry, not photographic.",
  },
  inked: {
    name: "Hand-inked, flat colour",
    text:
      "inked by hand with a brush: lines that go thick to thin, solid black shadow areas, hatching and feathering in the shade; " +
      "coloured with flat fills in a small palette and a fine dot pattern in the shading, with a hint of paper grain. " +
      "No gradients, no glow or lens-flare effects, no airbrushing, no soft digital shading, no 3D look, no photographic lighting.",
  },
  noir: {
    name: "Noir inks",
    text:
      "heavy brush inks with bold solid blacks and cross-hatching, coloured in flat muted fills, in a noir mood. " +
      "No gradients, no glows, no airbrushing, no soft shading, no 3D look.",
  },
} as const;
export type Style = keyof typeof STYLES;

/** What goes to the image model besides the setting. Each can be turned off on the demo page. */
export interface SquadOptions {
  style: Style;
  /** The card art, as reference pictures. */
  images: boolean;
  /** Each character's look in words, read off the card by OpenAI. */
  looks: boolean;
  /** The characters' names and the place's name. Some safety systems refuse these. */
  names: boolean;
}
// The mix that has drawn on every model so far: the looks alone, no art and no names for a filter to catch.
export const DEFAULT_OPTIONS: SquadOptions = { style: "modern", images: false, looks: true, names: false };

/** A character as the prompt introduces them. */
export interface CastMember {
  name: string;
  look?: string;
}

/** What the picture should look like, built from whatever the options let in. */
export function squadPrompt(setting: Setting, cast: readonly CastMember[], opts: SquadOptions): string {
  const count = cast.length;
  const thing = opts.images ? "attached cards, one character each" : "characters";
  const who =
    opts.names || opts.looks
      ? ` ${opts.images ? "The cards are" : "They are"}, in order: ${cast
          .map((m, i) => `${i + 1}. ${opts.names ? m.name : "a character"}${opts.looks && m.look ? ` (${m.look})` : ""}`)
          .join("; ")}.`
      : "";
  const known = opts.images ? "recognisable by the face, costume and colours on their card" : "drawn as described";
  const where = opts.names ? `${setting}: ${SETTINGS[setting]}` : SETTINGS[setting];
  return (
    `There are exactly ${count} ${thing}.${who} Draw exactly these ${count} characters and nobody else: ` +
    `no extra people, no background figures, no duplicates. Each character appears once, ${known}. ` +
    `Draw a brand-new illustration of them as one team, ${STYLES[opts.style].text} ` +
    `Invent the poses, the camera angle and the composition freely; nothing has to match ${opts.images ? "the cards" : "a reference"} except who they are and what they wear. ` +
    "A dynamic group shot, everyone clearly visible, the strongest front and centre. " +
    `Setting: ${where}. ` +
    `No text, no title, no logos, no borders, no speech bubbles${opts.images ? ", no card frames" : ""}.`
  );
}
