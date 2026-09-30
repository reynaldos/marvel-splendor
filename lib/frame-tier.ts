/** The account-level and card-level frames share one 8-tier ladder — both are a count that only ever goes up. */

export const FRAME_TIER_NAMES = [
  "Recruited",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
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

/** Border gradient per tier, overriding `frame-gold`'s `--frame-border`. Gold omitted — that's the utility's own default. */
export const FRAME_BORDER: Partial<Record<FrameTier, string>> = {
  Recruited: "linear-gradient(135deg, var(--color-cosmos-300), var(--color-cosmos-500) 50%, var(--color-cosmos-300))",
  Bronze: "linear-gradient(135deg, var(--color-amber-300), var(--color-amber-700) 50%, var(--color-amber-300))",
  Silver: "linear-gradient(135deg, var(--color-slate-200), var(--color-slate-400) 50%, var(--color-slate-200))",
  Platinum: "linear-gradient(135deg, var(--color-slate-50), var(--color-slate-300) 50%, var(--color-slate-50))",
  Diamond: "linear-gradient(135deg, var(--color-cyan-200), var(--color-cyan-500) 50%, var(--color-cyan-200))",
  Prismatic:
    "linear-gradient(135deg, var(--color-red-300), var(--color-amber-300) 25%, var(--color-emerald-300) 50%, var(--color-sky-300) 75%, var(--color-fuchsia-300))",
  Mastered: "linear-gradient(135deg, var(--color-cosmos-950), var(--color-gold-400) 50%, var(--color-cosmos-950))",
};
