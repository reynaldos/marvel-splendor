import { describe, expect, it } from "vitest";

import { allLines, isLine, refill, spaceAt, SPIRAL } from "@/lib/duel/board";
import { createDuel } from "@/lib/duel/setup";
import { BAG_COUNTS, BOARD_SPACES, GOLD, PEARL, PYRAMID_SLOTS, TOKEN_COLORS, type TokenColor } from "@/lib/duel/types";

describe("the board's spiral", () => {
  it("numbers all 25 spaces once, from the middle, down, then anticlockwise and out to the bottom right", () => {
    expect(SPIRAL).toHaveLength(BOARD_SPACES);
    expect(new Set(SPIRAL.map(([x, y]) => `${x},${y}`)).size).toBe(BOARD_SPACES);
    expect(SPIRAL[0]).toEqual([2, 2]);
    expect(SPIRAL[1]).toEqual([2, 3]); // down
    expect(SPIRAL[2]).toEqual([1, 3]); // then left
    expect(SPIRAL[24]).toEqual([4, 4]); // ends bottom right
    expect(spaceAt(4, 4)).toBe(24);
    expect(spaceAt(5, 0)).toBe(-1);
  });
});

describe("a new Duel game", () => {
  const game = createDuel("test-seed");

  it("empties the bag onto all 25 spaces and keeps the rest of nothing", () => {
    expect(game.board.every((t) => t !== null)).toBe(true);
    expect(game.bag).toHaveLength(0);
    const counts = Object.fromEntries(TOKEN_COLORS.map((t) => [t, game.board.filter((b) => b === t).length]));
    expect(counts).toEqual(BAG_COUNTS);
  });

  it("deals the pyramid 5, 4, 3 and the rest to the decks, 30/24/13 in all", () => {
    for (const level of [1, 2, 3] as const) {
      expect(game.pyramid[level]).toHaveLength(PYRAMID_SLOTS[level]);
      expect(game.pyramid[level].length + game.decks[level].length).toBe([30, 24, 13][level - 1]);
    }
  });

  it("gives the second player one Privilege and leaves two on the table", () => {
    const second = game.players[1 - game.startingSeat];
    expect(second.privileges).toBe(1);
    expect(game.players[game.startingSeat].privileges).toBe(0);
    expect(game.privileges).toBe(2);
    expect(game.royals).toHaveLength(4);
    expect(game.currentSeat).toBe(game.startingSeat);
  });

  it("deals the same game from the same seed", () => {
    expect(createDuel("test-seed")).toEqual(game);
    expect(createDuel("other").board).not.toEqual(game.board);
  });
});

describe("lines on the board", () => {
  // A board with one row known: spaces 0..24 filled, then a few set by hand.
  const board: (TokenColor | null)[] = Array(BOARD_SPACES).fill("mind");
  const at = (x: number, y: number) => spaceAt(x, y);
  board[at(0, 0)] = GOLD;
  board[at(2, 0)] = null;
  board[at(1, 0)] = PEARL;

  it("takes one to three touching tokens in a row, column or diagonal, either way round", () => {
    expect(isLine(board, [at(0, 4)])).toBe(true);
    expect(isLine(board, [at(0, 4), at(1, 4), at(2, 4)])).toBe(true);
    expect(isLine(board, [at(2, 4), at(1, 4), at(0, 4)])).toBe(true);
    expect(isLine(board, [at(4, 0), at(4, 1), at(4, 2)])).toBe(true);
    expect(isLine(board, [at(2, 2), at(3, 3), at(4, 4)])).toBe(true);
    expect(isLine(board, [at(2, 2), at(3, 1)])).toBe(true);
  });

  it("refuses a gap, a bend, a repeat, Gold, an empty space, or more than three", () => {
    expect(isLine(board, [at(0, 4), at(2, 4)])).toBe(false);
    expect(isLine(board, [at(0, 4), at(1, 4), at(1, 3)])).toBe(false);
    expect(isLine(board, [at(0, 4), at(0, 4)])).toBe(false);
    expect(isLine(board, [at(0, 0), at(1, 0)])).toBe(false);
    expect(isLine(board, [at(1, 0), at(2, 0)])).toBe(false);
    expect(isLine(board, [at(0, 4), at(1, 4), at(2, 4), at(3, 4)])).toBe(false);
    expect(isLine(board, [])).toBe(false);
  });

  it("lists every line, and each listed line is a line", () => {
    const lines = allLines(board);
    expect(lines.every((l) => isLine(board, l))).toBe(true);
    // 23 takeable tokens (25 less a Gold and an empty) each start a line of one.
    expect(lines.filter((l) => l.length === 1)).toHaveLength(23);
    expect(lines.some((l) => l.length === 3)).toBe(true);
  });
});

describe("refilling the board", () => {
  it("fills the empty spaces in spiral order until the bag runs out", () => {
    const board: (TokenColor | null)[] = Array(BOARD_SPACES).fill("soul");
    board[0] = board[5] = board[24] = null;
    const { board: after, bag } = refill({ board, bag: ["reality", GOLD] });
    expect(after[0]).toBe("reality");
    expect(after[5]).toBe(GOLD);
    expect(after[24]).toBeNull();
    expect(bag).toHaveLength(0);
  });
});
