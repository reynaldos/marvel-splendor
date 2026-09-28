import { describe, expect, it } from "vitest";
import { applyMove } from "@/lib/engine/apply";
import { getCard } from "@/lib/engine/data";
import type { Move } from "@/lib/engine/types";
import { AVENGERS_TILE_POINTS, emptyStones, emptyTokens } from "@/lib/engine/types";
import { makePlayer, makeState } from "./helpers";

// c1-01: level 1, cost { mind:1, space:1, soul:1, reality:1 }, bonus power, points 0
const FREE_CARD = "c1-01";

function fullBonuses(overrides: Partial<Record<string, number>> = {}) {
  return { ...emptyStones(), mind: 1, space: 1, soul: 1, power: 1, reality: 1, ...overrides };
}

describe("Win condition trigger + round completion", () => {
  it("does not finish immediately when a player qualifies mid-round; finishes once the round completes", () => {
    // 3 players; seat 0 triggers on their turn, seats 1 and 2 still need theirs
    // this round before the game can finalize.
    const card = getCard(FREE_CARD);
    const state = makeState(3, {
      startingSeat: 0,
      currentSeat: 0,
      market: { 1: [card.id, null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
      players: [
        makePlayer(0, {
          points: 16, // will become 16 (card is 0 pts) -- already at target, just needs the compound bits
          bonuses: fullBonuses({ power: 0 }), // missing power bonus, granted by this card
          tokens: { ...emptyTokens(), mind: 1, space: 1, soul: 1, reality: 1, time: 1 },
        }),
        makePlayer(1),
        makePlayer(2),
      ],
    });
    const move: Move = { type: "RECRUIT", from: "market", cardId: card.id };
    const afterSeat0 = applyMove(state, 0, move);

    expect(afterSeat0.players[0].points).toBe(16);
    expect(afterSeat0.endTriggered).toBe(true);
    expect(afterSeat0.status).toBe("active"); // round not finished yet
    expect(afterSeat0.currentSeat).toBe(1);

    const afterSeat1 = applyMove(afterSeat0, 1, { type: "TAKE_TOKENS", colors: ["mind"] });
    expect(afterSeat1.status).toBe("active");
    expect(afterSeat1.currentSeat).toBe(2);

    const afterSeat2 = applyMove(afterSeat1, 2, { type: "TAKE_TOKENS", colors: ["mind"] });
    // Round has completed (wrapped back to startingSeat 0) — finalize now.
    expect(afterSeat2.currentSeat).toBe(0);
    expect(afterSeat2.status).toBe("finished");
    expect(afterSeat2.winnerSeat).toBe(0);
  });

  it("continues the game if the trigger-er drops back below target before the round ends (loses Avengers tile)", () => {
    // Seat 0 hits the compound win condition via the Avengers tile's 3
    // points, but seat 1 then steals the tile back before the round ends,
    // dropping seat 0 below target again. Per ARCHITECTURE.md's edge case,
    // the game must continue rather than finalize.
    const stealCard = getCard("c3-04"); // tags: 2, enough to overtake seat0's 3 tags
    const state = makeState(2, {
      startingSeat: 0,
      currentSeat: 0,
      avengersHolder: 0,
      market: { 1: [null, null, null, null], 2: [null, null, null, null], 3: [stealCard.id, null, null, null] },
      players: [
        makePlayer(0, {
          points: 13 + AVENGERS_TILE_POINTS, // 16 total while holding the tile
          tags: 3,
          bonuses: fullBonuses(),
          tokens: { ...emptyTokens(), time: 1 },
        }),
        makePlayer(1, {
          tags: 2,
          tokens: { ...emptyTokens(), reality: 7, power: 3 },
        }),
      ],
    });
    // Sanity: seat 0 currently qualifies.
    expect(state.players[0].points).toBe(16);

    const afterSeat0 = applyMove(state, 0, { type: "TAKE_TOKENS", colors: ["mind"] });
    expect(afterSeat0.endTriggered).toBe(true);
    expect(afterSeat0.currentSeat).toBe(1);

    const move: Move = { type: "RECRUIT", from: "market", cardId: stealCard.id };
    const afterSeat1 = applyMove(afterSeat0, 1, move);
    // Tile stolen: seat 0 drops to 13 points, no longer qualifies.
    expect(afterSeat1.avengersHolder).toBe(1);
    expect(afterSeat1.players[0].points).toBe(13);
    // Round completed (back to startingSeat 0), but nobody currently qualifies.
    expect(afterSeat1.currentSeat).toBe(0);
    expect(afterSeat1.status).toBe("active");
  });
});

describe("End-game tiebreak", () => {
  const settings = { targetPoints: 16 };

  it("breaks a points tie in favor of the Avengers tile holder", () => {
    const state = makeState(
      2,
      {
        // seat 1 already had this round's first turn; seat 0's move below is
        // the last of the round, so the round-boundary finalize check fires.
        startingSeat: 1,
        currentSeat: 0,
        avengersHolder: 1,
        players: [
          makePlayer(0, { points: 20, bonuses: fullBonuses(), tokens: { ...emptyTokens(), time: 1 }, cards: ["a"] }),
          makePlayer(1, { points: 20, bonuses: fullBonuses(), tokens: { ...emptyTokens(), time: 1 }, cards: [] }),
        ],
      },
      settings,
    );
    const finished = applyMove(state, 0, { type: "TAKE_TOKENS", colors: ["mind"] });
    expect(finished.status).toBe("finished");
    expect(finished.winnerSeat).toBe(1);
    expect(finished.sharedWinners).toBeNull();
  });

  it("falls back to fewest cards when there's no Avengers-tile tiebreak", () => {
    const state = makeState(
      2,
      {
        startingSeat: 1,
        currentSeat: 0,
        avengersHolder: null,
        players: [
          makePlayer(0, {
            points: 20,
            bonuses: fullBonuses(),
            tokens: { ...emptyTokens(), time: 1 },
            cards: ["a", "b"],
          }),
          makePlayer(1, { points: 20, bonuses: fullBonuses(), tokens: { ...emptyTokens(), time: 1 }, cards: ["a"] }),
        ],
      },
      settings,
    );
    const finished = applyMove(state, 0, { type: "TAKE_TOKENS", colors: ["mind"] });
    expect(finished.status).toBe("finished");
    expect(finished.winnerSeat).toBe(1);
    expect(finished.sharedWinners).toBeNull();
  });

  it("declares a shared victory on a true tie (points, no tile-holder distinction, equal card counts)", () => {
    const state = makeState(
      2,
      {
        startingSeat: 1,
        currentSeat: 0,
        avengersHolder: null,
        players: [
          makePlayer(0, {
            points: 20,
            bonuses: fullBonuses(),
            tokens: { ...emptyTokens(), time: 1 },
            cards: ["a", "b"],
          }),
          makePlayer(1, {
            points: 20,
            bonuses: fullBonuses(),
            tokens: { ...emptyTokens(), time: 1 },
            cards: ["c", "d"],
          }),
        ],
      },
      settings,
    );
    const finished = applyMove(state, 0, { type: "TAKE_TOKENS", colors: ["mind"] });
    expect(finished.status).toBe("finished");
    expect(finished.winnerSeat).toBeNull();
    expect(finished.sharedWinners).toEqual([0, 1]);
  });

  it("only qualifying players are considered even if a non-qualifier has more points (missing bonus/Time Stone)", () => {
    const state = makeState(
      2,
      {
        startingSeat: 1,
        currentSeat: 0,
        players: [
          makePlayer(0, { points: 25, bonuses: emptyStones(), tokens: emptyTokens() }), // no bonuses, no Time Stone
          makePlayer(1, { points: 16, bonuses: fullBonuses(), tokens: { ...emptyTokens(), time: 1 } }),
        ],
      },
      settings,
    );
    const finished = applyMove(state, 0, { type: "TAKE_TOKENS", colors: ["mind"] });
    expect(finished.status).toBe("finished");
    expect(finished.winnerSeat).toBe(1);
  });
});

describe("END_BY_CLOCK", () => {
  it("finalizes at the next round boundary using ALL players (not just qualifiers), by normal tiebreak", () => {
    const state = makeState(3, {
      startingSeat: 0,
      currentSeat: 1, // clock expires mid-round
      players: [
        makePlayer(0, { points: 5, cards: ["a", "b", "c"] }),
        makePlayer(1, { points: 9, cards: ["a"] }),
        makePlayer(2, { points: 3 }),
      ],
    });
    const afterClock = applyMove(state, 1, { type: "END_BY_CLOCK" });
    expect(afterClock.clockExpired).toBe(true);
    expect(afterClock.status).toBe("active"); // round not done yet
    expect(afterClock.currentSeat).toBe(1); // the clock takes nobody's turn
    expect(afterClock.moveCount).toBe(state.moveCount + 1);

    const afterSeat1 = applyMove(afterClock, 1, { type: "TIMEOUT_SKIP" });
    expect(afterSeat1.status).toBe("active");

    // seat 2's move wraps currentSeat back to startingSeat (0) — the round
    // is now complete, so the clock-forced finalize fires right here.
    const afterSeat2 = applyMove(afterSeat1, 2, { type: "TIMEOUT_SKIP" });
    expect(afterSeat2.currentSeat).toBe(0);
    expect(afterSeat2.status).toBe("finished");
    expect(afterSeat2.winnerSeat).toBe(1); // highest points, nobody needed to qualify
  });
});

describe("END_BY_CLOCK at a round boundary", () => {
  it("ends the game at once: everyone has had the same number of turns", () => {
    const state = makeState(2, {
      startingSeat: 0,
      currentSeat: 0,
      moveCount: 8,
      players: [makePlayer(0, { points: 4 }), makePlayer(1, { points: 7 })],
    });
    const after = applyMove(state, 0, { type: "END_BY_CLOCK" });
    expect(after.status).toBe("finished");
    expect(after.winnerSeat).toBe(1);
  });

  it("leaves a pending choice with the player who owes it", () => {
    const state = makeState(2, {
      startingSeat: 0,
      currentSeat: 0,
      pending: { type: "RETURN_TOKENS", mustReturn: 1 },
      players: [makePlayer(0, { tokens: { ...emptyTokens(), mind: 11 } }), makePlayer(1)],
    });
    const after = applyMove(state, 0, { type: "END_BY_CLOCK" });
    expect(after.pending).toEqual(state.pending);
    expect(after.status).toBe("active");
  });
});

describe("TIMEOUT_SKIP", () => {
  it("resolves a pending RETURN_TOKENS with a default (returns highest-count tokens first) and passes", () => {
    const state = makeState(2, {
      pending: { type: "RETURN_TOKENS", mustReturn: 2 },
      players: [makePlayer(0, { tokens: { ...emptyTokens(), mind: 5, space: 1, shield: 1 } }), makePlayer(1)],
    });
    const next = applyMove(state, 0, { type: "TIMEOUT_SKIP" });
    expect(next.pending).toBeNull();
    expect(next.players[0].tokens.mind).toBe(3); // highest stack (5) returned first, twice
    expect(next.currentSeat).toBe(1);
  });

  it("passes the turn with no side effects when there is nothing pending", () => {
    const state = makeState(2);
    const next = applyMove(state, 0, { type: "TIMEOUT_SKIP" });
    expect(next.currentSeat).toBe(1);
    expect(next.moveCount).toBe(1);
  });
});
