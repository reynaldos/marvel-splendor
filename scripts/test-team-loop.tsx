import assert from "node:assert";
import { readFileSync } from "node:fs";

import { byStrength, wrapScroll } from "@/components/game/TeamView";
import { getCard } from "@/lib/engine/data";

// Swiping any distance either way never reaches an end: the position stays inside the middle copy.
const W = 2817; // one copy's width
const VIEW = 1311; // anything narrower than a copy
for (const step of [-900, -37, 37, 900, 2500, -2500]) {
  let left = W;
  for (let i = 0; i < 500; i++) {
    const before = left + step;
    left = wrapScroll(before, W);
    assert.ok(left >= 0 && left + VIEW <= 3 * W, `ran out of row at ${left} (step ${step})`);
    // The jump is a whole copy, so the same cards are under the finger after it.
    assert.equal((((left - before) % W) + W) % W, 0);
  }
}
assert.equal(wrapScroll(W, W), W, "resting in the middle copy: untouched");

// Only a row too wide to fit loops; it is drawn three times.
const src = readFileSync("components/game/TeamView.tsx", "utf8");
assert.match(src, /else if \(el\.scrollWidth > el\.clientWidth\) setLooping\(true\);/);
assert.match(src, /length: looping \? COPIES : 1/);
// The browser scrolls it, so touch works as it does anywhere else.
assert.match(src, /touch-pan-x overflow-x-auto overscroll-x-contain/);

// Still strongest first.
const sorted = ["c1-01", "c3-01", "c2-01"].map(getCard).sort(byStrength);
for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i - 1].points >= sorted[i].points);

console.log("ok: team row loops");
