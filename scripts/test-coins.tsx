import assert from "node:assert/strict";

import { coinsForOutcome, opponentTierFor } from "@/lib/coins";
import { DEFAULT_SETTINGS, type GameSettings } from "@/lib/engine/types";

const settings = (over: Partial<GameSettings> = {}): GameSettings => ({ ...DEFAULT_SETTINGS, ...over });

// A human opponent anywhere at the table pays the human rate, even alongside bots.
assert.equal(
  opponentTierFor(settings(), 0, [{ seat: 0, isBot: false }, { seat: 1, isBot: false }, { seat: 2, isBot: true }]),
  "human",
);

// All-bot table pays the toughest bot difficulty present, not the easiest.
assert.equal(
  opponentTierFor(
    settings({ botDifficultyBySeat: { 1: "easy", 2: "hard" } }),
    0,
    [{ seat: 0, isBot: false }, { seat: 1, isBot: true }, { seat: 2, isBot: true }],
  ),
  "hard",
);

// Filling a "multiplayer" room with bots still only pays the bot rate — no human farming.
assert.equal(
  opponentTierFor(settings({ botDifficulty: "normal" }), 0, [{ seat: 0, isBot: false }, { seat: 1, isBot: true }]),
  "normal",
);

// Payout table
assert.equal(coinsForOutcome("human", true, 10), 50);
assert.equal(coinsForOutcome("human", false, 10), 20);
assert.equal(coinsForOutcome("hard", true, 10), 30);
assert.equal(coinsForOutcome("hard", false, 10), 12);
assert.equal(coinsForOutcome("normal", true, 10), 18);
assert.equal(coinsForOutcome("normal", false, 10), 7);
assert.equal(coinsForOutcome("easy", true, 10), 10);
assert.equal(coinsForOutcome("easy", false, 10), 4);

// Guardrail: fewer than 4 turns pays nothing, blocking an instant-forfeit farm loop.
assert.equal(coinsForOutcome("human", true, 3), 0);
assert.equal(coinsForOutcome("human", true, 4), 50);

console.log("coins.ts: all assertions passed");
