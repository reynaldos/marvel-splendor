/**
 * The 5 by 5 token board. Spaces are numbered in spiral order, the order the
 * bag fills them: from the middle, down, then round anticlockwise and out,
 * ending at the bottom right. Lines are read on the grid those spaces make.
 */
import { BOARD_SPACES, GOLD, type DuelState, type TokenColor } from "./types";

export const GRID = 5;

/** Space index -> [column, row], 0,0 at the top left. */
export const SPIRAL: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [[2, 2]];
  let [x, y] = [2, 2];
  const dirs: [number, number][] = [[0, 1], [-1, 0], [0, -1], [1, 0]];
  for (let step = 1, d = 0; out.length < BOARD_SPACES; step++) {
    for (let k = 0; k < 2 && out.length < BOARD_SPACES; k++, d++) {
      for (let i = 0; i < step && out.length < BOARD_SPACES; i++) {
        x += dirs[d % 4][0];
        y += dirs[d % 4][1];
        out.push([x, y]);
      }
    }
  }
  return out;
})();

/** [column, row] -> space index. */
export function spaceAt(x: number, y: number): number {
  return SPIRAL.findIndex(([sx, sy]) => sx === x && sy === y);
}

/**
 * Whether these spaces are a line a player may take: one to three, each holding a token that is not Gold,
 * in a straight row, column or diagonal with no gap. The order they were picked in does not matter.
 */
export function isLine(board: readonly (TokenColor | null)[], spaces: readonly number[]): boolean {
  if (spaces.length < 1 || spaces.length > 3 || new Set(spaces).size !== spaces.length) return false;
  for (const s of spaces) {
    if (s < 0 || s >= BOARD_SPACES) return false;
    const token = board[s];
    if (!token || token === GOLD) return false;
  }
  if (spaces.length === 1) return true;
  // Along any straight line, the spaces sorted by column then row run from one end to the other.
  const sorted = [...spaces].sort((a, b) => SPIRAL[a][0] - SPIRAL[b][0] || SPIRAL[a][1] - SPIRAL[b][1]);
  const [x0, y0] = SPIRAL[sorted[0]];
  const [x1, y1] = SPIRAL[sorted[1]];
  const [dx, dy] = [x1 - x0, y1 - y0];
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1) return false;
  for (let i = 2; i < sorted.length; i++) {
    const [px, py] = SPIRAL[sorted[i - 1]];
    const [x, y] = SPIRAL[sorted[i]];
    if (x - px !== dx || y - py !== dy) return false;
  }
  return true;
}

/** Every line a player may take from this board, each as its spaces in order. */
export function allLines(board: readonly (TokenColor | null)[]): number[][] {
  const lines: number[][] = [];
  const dirs: [number, number][] = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (let s = 0; s < BOARD_SPACES; s++) {
    if (!board[s] || board[s] === GOLD) continue;
    lines.push([s]);
    const [x, y] = SPIRAL[s];
    for (const [dx, dy] of dirs) {
      const line = [s];
      for (let n = 1; n < 3; n++) {
        const next = spaceAt(x + dx * n, y + dy * n);
        if (next < 0 || !board[next] || board[next] === GOLD) break;
        line.push(next);
        lines.push([...line]);
      }
    }
  }
  return lines;
}

/** The board after the bag is emptied onto its empty spaces, in spiral order, until one or the other runs out. */
export function refill(state: Pick<DuelState, "board" | "bag">): Pick<DuelState, "board" | "bag"> {
  const board = [...state.board];
  const bag = [...state.bag];
  for (let s = 0; s < BOARD_SPACES && bag.length > 0; s++) {
    if (board[s] === null) board[s] = bag.shift()!;
  }
  return { board, bag };
}
