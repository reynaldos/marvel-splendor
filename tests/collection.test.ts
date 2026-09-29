import { describe, expect, it } from "vitest";

import { cardsRecruited } from "@/lib/collection";
import type { Move } from "@/lib/engine/types";

const recruit = (seat: number, cardId: string) => ({ seat, move: { type: "RECRUIT", from: "market", cardId } as Move });
const take = (seat: number) => ({ seat, move: { type: "TAKE_TOKENS", colors: ["mind"] } as Move });
const skip = (seat: number, stuck?: true) => ({ seat, move: { type: "TIMEOUT_SKIP", stuck } as Move });
const found = (moves: Parameters<typeof cardsRecruited>[0], seat: number) => Object.fromEntries(cardsRecruited(moves).get(seat) ?? []);

describe("cardsRecruited", () => {
  it("counts each seat's own recruits, and how many times", () => {
    const moves = [recruit(0, "a"), recruit(1, "b"), recruit(0, "c"), take(1), recruit(0, "a")];
    expect(found(moves, 0)).toEqual({ a: 2, c: 1 });
    expect(found(moves, 1)).toEqual({ b: 1 });
  });

  it("counts a card recruited out of the player's reserve", () => {
    const moves = [{ seat: 0, move: { type: "RESERVE", from: "deck", level: 1 } as Move }, { seat: 0, move: { type: "RECRUIT", from: "reserve", cardId: "a" } as Move }];
    expect(found(moves, 0)).toEqual({ a: 1 });
  });

  it("leaves out what the stand-in bot recruits while a player is away", () => {
    const moves = [recruit(0, "mine"), skip(0), skip(0), skip(0), recruit(0, "bots"), recruit(0, "bots-too")];
    expect(found(moves, 0)).toEqual({ mine: 1 });
  });

  it("counts again once the player is back", () => {
    const moves = [skip(0), skip(0), skip(0), recruit(0, "bots"), { seat: 0, move: { type: "REJOIN" } as Move }, recruit(0, "mine")];
    expect(found(moves, 0)).toEqual({ mine: 1 });
  });

  it("does not take a player who is merely late, or stuck, for one who is away", () => {
    expect(found([skip(0), skip(0), recruit(0, "a"), skip(0), skip(0), recruit(0, "b")], 0)).toEqual({ a: 1, b: 1 });
    expect(found([skip(0, true), skip(0, true), skip(0, true), recruit(0, "a")], 0)).toEqual({ a: 1 });
  });

  it("keeps one player's absence from touching another's cards", () => {
    const moves = [skip(0), recruit(1, "a"), skip(0), recruit(1, "b"), skip(0), recruit(1, "c")];
    expect(found(moves, 1)).toEqual({ a: 1, b: 1, c: 1 });
  });
});
