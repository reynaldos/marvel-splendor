import { describe, expect, it, vi } from "vitest";

import { duelArt } from "@/components/duel/duel-art";
import { cardsRecruited } from "@/lib/collection";

// The pictures come from the real cards.
vi.unmock("@/data/cards.json");

describe("a Duel and the collection", () => {
  it("counts a recruited Duel card as the Marvel card whose picture it wears", () => {
    const found = cardsRecruited([
      { seat: 0, move: { type: "TAKE_LINE", spaces: [0] } },
      { seat: 1, move: { type: "BUY", cardId: "d1-05" } },
      { seat: 1, move: { type: "BUY", cardId: "d1-05" } },
    ]);
    expect(found.get(0)).toBeUndefined();
    expect([...found.get(1)!]).toEqual([[duelArt("d1-05").id, 2]]);
  });
});
