import type { CSSProperties } from "react";

/** The account-level and card-level frames share one 10-tier ladder — both are a count that only ever goes up. */

export const FRAME_TIER_NAMES = [
  "Recruited",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Emerald",
  "Ruby",
  "Diamond",
  "Prismatic",
  "Mastered",
] as const;

export type FrameTier = (typeof FRAME_TIER_NAMES)[number];

/** The tier for `count`, given each tier's minimum in the same order as `FRAME_TIER_NAMES`. */
export function frameTierFor(count: number, minimums: readonly number[]): FrameTier {
  let tier: FrameTier = FRAME_TIER_NAMES[0];
  FRAME_TIER_NAMES.forEach((name, i) => {
    if (count >= minimums[i]) tier = name;
  });
  return tier;
}

/** Facets of one gem colour, turning round the frame like light on a cut stone. Stops are theme colour names. */
function facets(...stops: string[]): string {
  const at = (i: number) => (i / (stops.length - 1)) * 100;
  return `conic-gradient(from 210deg, ${stops.map((c, i) => `var(--color-${c}) ${at(i)}%`).join(", ")})`;
}

/** A band of light crossing the face, in the tints given. */
function sheen(...tints: string[]): string {
  const step = 40 / (tints.length + 1);
  return `linear-gradient(115deg, transparent 30%, ${tints.map((t, i) => `${t} ${30 + step * (i + 1)}%`).join(", ")}, transparent 70%)`;
}

/** Points of light on the face, as on a foil card, in one colour. */
function sparkle(color: string): string {
  return ["18% 22%", "78% 14%", "64% 58%", "26% 80%", "88% 86%", "46% 38%", "10% 52%", "72% 92%"]
    .map((at) => `radial-gradient(circle at ${at}, ${color} 0, ${color} 1.5px, transparent 4px)`)
    .join(", ");
}

/** Facets over the face, as on a cut crystal: a bright edge, then a faint fill the art shows through. */
function shards(fill: string, edge: string): string {
  return [
    "115deg, transparent 38%, E 38%, E 39.5%, F 39.5%, F 50%, transparent 50%",
    "25deg, transparent 60%, E 60%, E 61.5%, F 61.5%, F 70%, transparent 70%",
    "155deg, transparent 12%, E 12%, E 13.5%, F 13.5%, F 20%, transparent 20%",
    "65deg, transparent 22%, E 22%, E 23.5%, F 23.5%, F 30%, transparent 30%",
    "100deg, transparent 80%, E 80%, E 81.5%, F 81.5%, F 90%, transparent 90%",
  ]
    .map((band) => `linear-gradient(${band.replaceAll("E", edge).replaceAll("F", fill)})`)
    .join(", ");
}

/** A wash of colour over the whole face, for the holographic tiers. */
function tint(...colors: string[]): string {
  return `linear-gradient(160deg, ${colors.join(", ")})`;
}

interface Look {
  /** A vignette in this colour round the edge of the face. */
  glow?: string;
  /** Still light on the face: a sheen band, crystal facets, a wash of colour. */
  sheen?: string;
  /** Sparkles that come and go, for the tiers without the holographic sheen. */
  spark?: string;
  /** The moving holographic sheen, for the top tiers. */
  holo?: string;
}

function look(border: string, { glow, sheen, spark, holo }: Look = {}): CSSProperties {
  return {
    "--frame-border": border,
    "--frame-glow": glow,
    "--frame-sheen": sheen,
    "--frame-spark": spark,
    "--frame-holo": holo,
  } as CSSProperties;
}

const WHITE_SPARK = sparkle("rgb(255 255 255 / 0.95)");
const WHITE_EDGE = "rgb(255 255 255 / 0.55)";
const CLEAR_SHARDS = shards("rgb(255 255 255 / 0.1)", "rgb(255 255 255 / 0.45)");

/**
 * Each tier's look as CSS variables for the `frame-gold` and `frame-face` utilities: a faceted gem
 * border with an aura, and over the face a vignette, still light, or the moving holographic sheen.
 * Styled after collector trading cards: the further up, the flashier.
 */
export const FRAME_STYLE: Record<FrameTier, CSSProperties> = {
  Recruited: look(
    "linear-gradient(135deg, var(--color-cosmos-300), var(--color-cosmos-500) 50%, var(--color-cosmos-300))",
  ),
  Bronze: look(
    facets("amber-800", "amber-400", "amber-200", "amber-700", "amber-300", "amber-900", "amber-500", "amber-800"),
    {
      glow: "rgb(217 119 6 / 0.85)",
      sheen: sheen("rgb(255 200 120 / 0.5)"),
    },
  ),
  Silver: look(
    facets("slate-500", "slate-100", "white", "slate-400", "slate-200", "slate-600", "slate-300", "slate-500"),
    {
      glow: "rgb(203 213 225 / 0.8)",
      sheen: sheen("rgb(255 255 255 / 0.5)"),
      spark: WHITE_SPARK,
    },
  ),
  Gold: look(facets("gold-600", "gold-400", "gold-200", "gold-600", "gold-200", "gold-600", "gold-400", "gold-600"), {
    glow: "rgb(246 201 69 / 0.9)",
    sheen: sheen("rgb(255 240 168 / 0.55)"),
    spark: sparkle("rgb(255 240 168 / 0.95)"),
  }),
  Platinum: look(facets("slate-300", "white", "cyan-100", "slate-200", "white", "slate-400", "cyan-50", "slate-300"), {
    glow: "rgb(255 255 255 / 0.85)",
    sheen: `${sheen("rgb(255 255 255 / 0.3)", "rgb(200 245 255 / 0.4)", "rgb(255 255 255 / 0.3)")}, ${shards("rgb(255 255 255 / 0.12)", WHITE_EDGE)}`,
    spark: WHITE_SPARK,
  }),
  Emerald: look(
    facets(
      "emerald-900",
      "emerald-400",
      "emerald-200",
      "emerald-700",
      "emerald-300",
      "emerald-950",
      "emerald-500",
      "emerald-900",
    ),
    {
      glow: "rgb(16 185 129 / 0.9)",
      sheen: `${shards("rgb(52 211 153 / 0.22)", WHITE_EDGE)}, ${tint("rgb(6 95 70 / 0.25)", "transparent 50%", "rgb(110 231 183 / 0.2)")}`,
      spark: WHITE_SPARK,
    },
  ),
  Ruby: look(facets("red-950", "red-500", "rose-200", "red-800", "rose-300", "red-950", "red-600", "red-950"), {
    glow: "rgb(225 29 72 / 0.9)",
    sheen: `${shards("rgb(251 113 133 / 0.22)", WHITE_EDGE)}, ${tint("rgb(136 19 55 / 0.25)", "transparent 50%", "rgb(251 113 133 / 0.2)")}`,
    spark: WHITE_SPARK,
  }),
  Diamond: look(facets("cyan-700", "cyan-200", "white", "sky-500", "cyan-100", "sky-700", "cyan-300", "cyan-700"), {
    glow: "rgb(34 211 238 / 0.9)",
    sheen: `${tint("rgb(120 220 255 / 0.2)", "transparent 40%", "rgb(255 255 255 / 0.12) 60%", "rgb(80 180 255 / 0.2)")}, ${CLEAR_SHARDS}, ${WHITE_SPARK}`,
    holo: sheen("rgb(255 255 255 / 0.5)", "rgb(160 240 255 / 0.6)", "rgb(255 255 255 / 0.5)"),
  }),
  Prismatic: look(
    facets(
      "pink-300",
      "fuchsia-200",
      "sky-200",
      "emerald-200",
      "yellow-200",
      "pink-200",
      "violet-300",
      "cyan-200",
      "pink-300",
    ),
    {
      glow: "rgb(244 114 182 / 0.9)",
      sheen: `${tint(
        "rgb(255 120 180 / 0.2)",
        "rgb(255 230 120 / 0.18) 25%",
        "rgb(120 255 200 / 0.18) 50%",
        "rgb(120 180 255 / 0.18) 75%",
        "rgb(220 120 255 / 0.2)",
      )}, ${CLEAR_SHARDS}, ${WHITE_SPARK}`,
      holo: sheen(
        "rgb(255 110 110 / 0.55)",
        "rgb(255 230 110 / 0.55)",
        "rgb(110 255 170 / 0.55)",
        "rgb(110 190 255 / 0.55)",
        "rgb(230 110 255 / 0.55)",
      ),
    },
  ),
  Mastered: look(
    facets(
      "violet-950",
      "fuchsia-700",
      "gold-400",
      "violet-900",
      "gold-200",
      "violet-950",
      "fuchsia-600",
      "violet-950",
    ),
    {
      glow: "rgb(168 85 247 / 0.95)",
      sheen: `${tint("rgb(120 40 200 / 0.28)", "transparent 45%", "rgb(255 200 90 / 0.22)")}, ${shards("rgb(255 220 130 / 0.1)", "rgb(255 220 130 / 0.5)")}, ${sparkle("rgb(255 220 130 / 0.95)")}`,
      holo: sheen("rgb(255 215 120 / 0.6)", "rgb(255 255 255 / 0.4)", "rgb(200 120 255 / 0.6)"),
    },
  ),
};

/** The classes that draw each tier's face: still light past Recruited, twinkling sparkles from Silver, moving light along the border from Platinum, the holographic sheen from Diamond. */
export const FRAME_EFFECT: Partial<Record<FrameTier, string>> = {
  Bronze: "frame-face",
  Silver: "frame-face frame-twinkle",
  Gold: "frame-face frame-twinkle",
  Platinum: "frame-face frame-twinkle frame-shine",
  Emerald: "frame-face frame-twinkle frame-shine",
  Ruby: "frame-face frame-twinkle frame-shine",
  Diamond: "frame-face frame-shine frame-holo",
  Prismatic: "frame-face frame-shine frame-holo",
  Mastered: "frame-face frame-shine frame-holo",
};
