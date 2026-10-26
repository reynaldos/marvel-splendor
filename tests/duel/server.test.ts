import { describe, expect, it } from "vitest";

import { applyDuelMove } from "@/lib/duel/apply";
import { legalDuelMoves } from "@/lib/duel/legal-moves";
import { createDuel } from "@/lib/duel/setup";
import { redactDuel } from "@/lib/duel/view";
import { DEFAULT_SETTINGS } from "@/lib/engine/types";
import { moveSummaries, replaySteps } from "@/lib/game-replay";
import { createAny, isDuel, rankable, rulesOf } from "@/lib/game-rules";
import { runServerTurnLoop } from "@/lib/game-server";

const duelSettings = { ...DEFAULT_SETTINGS, rules: "duel" as const, botDifficulty: "normal" as const };

describe("the rules adapter", () => {
  it("deals the game the settings name, and a Duel for two whatever the count", () => {
    expect(rulesOf({})).toBe("marvel");
    expect(rulesOf({ rules: "duel" })).toBe("duel");
    const duel = createAny("duel", 4, "s", duelSettings);
    expect(isDuel(duel)).toBe(true);
    expect(duel.players).toHaveLength(2);
    expect(isDuel(createAny("marvel", 3, "s", DEFAULT_SETTINGS))).toBe(false);
  });

  it("gives the records a Duel player's points, cards and crowns in the Marvel shape", () => {
    const duel = createDuel("r");
    const record = rankable(duel);
    expect(record.players[0]).toEqual({ seat: 0, points: 0, cards: [], tags: 0 });
    expect(record.sharedWinners).toBeNull();
  });
});

describe("the Duel view", () => {
  it("hides the bag's order and the opponent's reserved cards, and the pending choice from the other seat", () => {
    let state = createDuel("view");
    const seat = state.currentSeat;
    const reserve = legalDuelMoves(state, seat).find((m) => m.type === "RESERVE" && m.from === "pyramid")!;
    state = applyDuelMove(state, seat, reserve);
    const mine = redactDuel(state, seat);
    const theirs = redactDuel(state, 1 - seat);
    expect(mine.players[seat].reserved[0]).toHaveProperty("cardId");
    // A blind reserve is hidden from the other seat; one from the pyramid was seen by both.
    const blind = "blind" in mine.players[seat].reserved[0] && mine.players[seat].reserved[0].blind;
    expect(theirs.players[seat].reserved[0]).toEqual(blind ? { hidden: true, level: expect.any(Number) } : { cardId: expect.any(String), blind: false });
    expect(theirs).not.toHaveProperty("bag");
    expect(theirs.bagCount).toBe(state.bag.length);
    const pending = { ...state, pending: { type: "RETURN_TOKENS" as const, mustReturn: 1 } };
    expect(redactDuel(pending, pending.currentSeat).pending).not.toBeNull();
    expect(redactDuel(pending, 1 - pending.currentSeat).pending).toBeNull();
  });
});

describe("a Duel through the server pieces", () => {
  it("plays two bots to the end and replays the log onto the stored state", () => {
    const seed = "server-duel";
    const start = createAny("duel", 2, seed, duelSettings);
    const { state, applied } = runServerTurnLoop(start, () => true);
    expect(state.status).toBe("finished");
    const moves = applied.map(({ seat, move }) => ({ seat, move }));
    const steps = replaySteps({ seed, settings: duelSettings, playerCount: 2, moves, since: 0, viewerSeat: 0, finalState: state });
    expect(steps).not.toBeNull();
    expect(steps).toHaveLength(moves.length);
    expect(steps![steps!.length - 1].view.status).toBe("finished");
    const summaries = moveSummaries({ seed, settings: duelSettings, playerCount: 2, moves });
    expect(summaries).toHaveLength(moves.length);
    expect(summaries.every((s) => s.events.every((e) => ["royal", "privilege", "steal"].includes(e.kind)) && s.round >= 1)).toBe(true);
  });
});
