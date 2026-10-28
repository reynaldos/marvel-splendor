import { describe, expect, it, vi } from "vitest";

import { duelArt } from "@/components/duel/duel-art";
import { chooseDuelBotMove } from "@/lib/bot/duel-policy";
import { applyDuelMove } from "@/lib/duel/apply";
import { getDuelCard, MARVEL_DUEL_CARDS } from "@/lib/duel/data";
import { legalDuelMoves } from "@/lib/duel/legal-moves";
import { hasWon } from "@/lib/duel/rules";
import { createDuel } from "@/lib/duel/setup";
import { STONES } from "@/lib/duel/types";
import { validateDuelMove } from "@/lib/duel/validate";
import { ALL_CARDS, cardPool, PACKS } from "@/lib/engine/data";

// The set is made from the real cards and packs.
vi.unmock("@/data/cards.json");
vi.unmock("@/data/locations.json");
vi.unmock("@/data/packs.json");

describe("the Marvel card set", () => {
  it("has a Duel card for every Marvel card, of its level, wearing its own picture", () => {
    expect(MARVEL_DUEL_CARDS.map((c) => c.id).sort()).toEqual(ALL_CARDS.map((c) => c.id).sort());
    for (const card of MARVEL_DUEL_CARDS) {
      const marvel = ALL_CARDS.find((c) => c.id === card.id)!;
      expect(card.level).toBe(marvel.level);
      if (card.bonus !== "wild" && card.bonus !== null) expect(card.bonus).toBe(marvel.bonus);
      expect(duelArt(card.id).id).toBe(card.id);
      expect(getDuelCard(card.id)).toBe(card);
    }
    // Every power is in the set, and wild and no-bonus cards too.
    expect(new Set(MARVEL_DUEL_CARDS.map((c) => c.ability))).toEqual(new Set([null, "again", "token", "privilege", "steal", "wild"]));
    expect(MARVEL_DUEL_CARDS.some((c) => c.bonus === null)).toBe(true);
    for (const s of STONES) expect(MARVEL_DUEL_CARDS.some((c) => c.bonus === s)).toBe(true);
  });

  it("deals a new Duel from the base cards, and a pack's cards only when the table owns it", () => {
    const base = createDuel("set", { cardSet: "marvel" });
    const dealt = (game: ReturnType<typeof createDuel>) => ([1, 2, 3] as const).flatMap((l) => [...game.pyramid[l], ...game.decks[l]]).filter((id): id is string => id !== null);
    expect(dealt(base).sort()).toEqual(cardPool([]).map((c) => c.id).sort());
    const pack = PACKS.find((p) => p.cards.length > 0)!;
    const withPack = createDuel("set", { cardSet: "marvel", packs: [pack.id] });
    expect(dealt(withPack)).toEqual(expect.arrayContaining(pack.cards));
    expect(dealt(base)).not.toEqual(expect.arrayContaining(pack.cards));
    // Without the setting, the box's 67 as before.
    expect(dealt(createDuel("set")).every((id) => id.startsWith("d"))).toBe(true);
  });

  it("is played to the end by the bots", () => {
    let state = createDuel("marvel-bots", { cardSet: "marvel", botDifficulty: "normal" });
    for (let moves = 0; state.status === "active"; moves++) {
      if (moves > 800) throw new Error("the game did not finish");
      const seat = state.currentSeat;
      if (legalDuelMoves(state, seat).length === 0) {
        state = applyDuelMove(state, seat, { type: "TIMEOUT_SKIP", stuck: true });
        continue;
      }
      const move = chooseDuelBotMove(state, seat);
      expect(validateDuelMove(state, seat, move).ok).toBe(true);
      state = applyDuelMove(state, seat, move);
    }
    expect(hasWon(state.players[state.winnerSeat!])).toBe(true);
  });
});
