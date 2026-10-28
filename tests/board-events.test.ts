import { describe, expect, it } from "vitest";

import { boardEvents, duelEvents, leavesATrace } from "@/lib/board-events";
import { createDuel } from "@/lib/duel/setup";
import { emptyTokens } from "@/lib/engine/types";

import { makePlayer, makeState } from "./engine/helpers";

const table = (over: Parameters<typeof makeState>[1] = {}) => makeState(3, over);

describe("boardEvents", () => {
  it("finds nothing in an ordinary move", () => {
    const after = table({ players: [makePlayer(0, { points: 2, cards: ["a"] }), makePlayer(1), makePlayer(2)] });
    expect(boardEvents(table(), after)).toEqual([]);
  });

  it("finds a Location claimed, and by whom", () => {
    const after = table({ players: [makePlayer(0), makePlayer(1, { locations: ["l1"] }), makePlayer(2)] });
    expect(boardEvents(table(), after)).toEqual([{ kind: "location", seat: 1, locationId: "l1" }]);
  });

  it("leaves out a Location already held", () => {
    const held = [makePlayer(0, { locations: ["l1"] }), makePlayer(1), makePlayer(2)];
    expect(boardEvents(table({ players: held }), table({ players: held }))).toEqual([]);
  });

  it("finds the Avengers tile claimed, and stolen", () => {
    expect(boardEvents(table(), table({ avengersHolder: 2 }))).toEqual([{ kind: "avengers", seat: 2, from: null }]);
    expect(boardEvents(table({ avengersHolder: 2 }), table({ avengersHolder: 0 }))).toEqual([
      { kind: "avengers", seat: 0, from: 2 },
    ]);
    expect(boardEvents(table({ avengersHolder: 2 }), table({ avengersHolder: 2 }))).toEqual([]);
  });

  it("finds the Time Stone taken", () => {
    const after = table({ players: [makePlayer(0, { tokens: { ...emptyTokens(), time: 1 } }), makePlayer(1), makePlayer(2)] });
    expect(boardEvents(table(), after)).toEqual([{ kind: "timeStone", seat: 0 }]);
    expect(boardEvents(after, after)).toEqual([]);
  });

  it("puts everything one move brought about in the order the rules award it", () => {
    const after = table({
      avengersHolder: 0,
      players: [makePlayer(0, { tokens: { ...emptyTokens(), time: 1 }, locations: ["l1"] }), makePlayer(1), makePlayer(2)],
    });
    expect(boardEvents(table(), after).map((e) => e.kind)).toEqual(["timeStone", "avengers", "location"]);
  });
});

describe("leavesATrace", () => {
  it("is true only for moves that pick something off the board", () => {
    expect(leavesATrace({ type: "TAKE_TOKENS", colors: ["mind"] })).toBe(true);
    expect(leavesATrace({ type: "RESERVE", from: "deck", level: 1 })).toBe(true);
    expect(leavesATrace({ type: "RECRUIT", from: "market", cardId: "a" })).toBe(true);
    expect(leavesATrace({ type: "RETURN_TOKENS", tokens: {} })).toBe(false);
    expect(leavesATrace({ type: "CHOOSE_LOCATION", locationId: "l1" })).toBe(false);
    expect(leavesATrace({ type: "TIMEOUT_SKIP" })).toBe(false);
  });
});

describe("duelEvents", () => {
  it("finds a Royal taken, and by whom", () => {
    const before = createDuel("events");
    const after = { ...before, players: [before.players[0], { ...before.players[1], royals: ["r-2"] }] as typeof before.players };
    expect(duelEvents(before, after)).toEqual([{ kind: "royal", seat: 1, royalId: "r-2" }]);
    expect(duelEvents(after, after)).toEqual([]);
  });

  it("tells a Privilege spent from one taken off the other player", () => {
    const before = createDuel("events");
    const holder = before.players.findIndex((p) => p.privileges > 0);
    const other = 1 - holder;
    const players = (a: number, b: number) => [{ ...before.players[0], privileges: a }, { ...before.players[1], privileges: b }] as typeof before.players;
    // The holder spends it: back to the table.
    const spent = { ...before, players: holder === 0 ? players(0, 0) : players(0, 0), privileges: before.privileges + 1 };
    expect(duelEvents(before, spent, { seat: holder, move: { type: "SPEND_PRIVILEGE" } })).toEqual([{ kind: "privilege", seat: holder }]);
    // The other player earns one with the table bare: it comes off the holder.
    const bare = { ...before, privileges: 0 };
    const taken = { ...bare, players: holder === 0 ? players(0, 1) : players(1, 0) };
    expect(duelEvents(bare, taken, { seat: other, move: { type: "REFILL" } })).toEqual([{ kind: "privilege", seat: other, from: holder }]);
  });
});
