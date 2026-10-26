import { describe, expect, it } from "vitest";

import { applyDuelMove } from "@/lib/duel/apply";
import { spaceAt } from "@/lib/duel/board";
import { getDuelCard } from "@/lib/duel/data";
import { legalDuelMoves } from "@/lib/duel/legal-moves";
import { crownsOf, pointsOf } from "@/lib/duel/rules";
import { createDuel } from "@/lib/duel/setup";
import { GOLD, PEARL, emptyTokens, type DuelPlayer, type DuelState } from "@/lib/duel/types";
import { validateDuelMove } from "@/lib/duel/validate";

const base = createDuel("apply-test");
const me = base.currentSeat;
const other = 1 - me;
const withPlayer = (state: DuelState, seat: number, over: Partial<DuelPlayer>): DuelState => {
  const players = [...state.players] as DuelState["players"];
  players[seat] = { ...players[seat], ...over };
  return { ...state, players };
};
/** A state whose board is one color in every space, so lines and powers are easy to point at. */
const flat = (token: DuelState["board"][number]): DuelState => ({ ...base, board: Array(25).fill(token) });
/** The top row, left to right: a straight line of three. */
const TOP = [spaceAt(0, 0), spaceAt(1, 0), spaceAt(2, 0)];
const play = (state: DuelState, seat: number, move: Parameters<typeof applyDuelMove>[2]) => {
  const v = validateDuelMove(state, seat, move);
  if (!v.ok) throw new Error(v.reason);
  return applyDuelMove(state, seat, move);
};

describe("taking a line", () => {
  it("moves the tokens to the player, ends the turn, and hands over a Privilege for three of a color", () => {
    const next = play(flat("mind"), me, { type: "TAKE_LINE", spaces: TOP });
    expect(next.players[me].tokens.mind).toBe(3);
    expect(TOP.map((s) => next.board[s])).toEqual([null, null, null]);
    expect(next.currentSeat).toBe(other);
    expect(next.players[other].privileges).toBe(2); // the one from setup and the one owed
    expect(next.privileges).toBe(1);
  });

  it("owes a Privilege for two Pearls, and takes it from the opponent when the table has none", () => {
    const board = flat("mind").board.map((t, i) => (i < 2 ? PEARL : t));
    const state: DuelState = withPlayer({ ...flat("mind"), board, privileges: 0 }, me, { privileges: 3 });
    const next = play(state, me, { type: "TAKE_LINE", spaces: [0, 1] });
    expect(next.players[other].privileges).toBe(2);
    expect(next.players[me].privileges).toBe(2);
  });

  it("asks for tokens back when the hand goes over ten, then ends the turn", () => {
    const state = withPlayer(flat("mind"), me, { tokens: { ...emptyTokens(), space: 9 } });
    const over = play(state, me, { type: "TAKE_LINE", spaces: TOP });
    expect(over.pending).toEqual({ type: "RETURN_TOKENS", mustReturn: 2 });
    expect(over.currentSeat).toBe(me);
    const done = play(over, me, { type: "RETURN_TOKENS", tokens: { space: 2 } });
    expect(done.bag).toEqual(["space", "space"]);
    expect(done.currentSeat).toBe(other);
  });
});

describe("free moves", () => {
  it("a spent Privilege takes any token and leaves the turn open for the action", () => {
    const state = withPlayer(flat("soul"), me, { privileges: 1 });
    const picking = play(state, me, { type: "SPEND_PRIVILEGE" });
    expect(picking.pending).toEqual({ type: "PICK_TOKEN", reason: "privilege" });
    const picked = play(picking, me, { type: "PICK_TOKEN", space: 7 });
    expect(picked.players[me].tokens.soul).toBe(1);
    expect(picked.currentSeat).toBe(me);
    expect(picked.pending).toBeNull();
    expect(legalDuelMoves(picked, me).some((m) => m.type === "TAKE_LINE")).toBe(true);
  });

  it("a refill deals the bag onto the gaps, hands the opponent a Privilege, and is once a turn", () => {
    const board = flat("soul").board.map((t, i) => (i < 3 ? null : t));
    const state: DuelState = { ...flat("soul"), board, bag: ["reality", GOLD] };
    const next = play(state, me, { type: "REFILL" });
    expect(next.board.slice(0, 3)).toEqual(["reality", GOLD, null]);
    expect(next.bag).toEqual([]);
    expect(next.players[other].privileges).toBe(2);
    expect(next.refilled).toBe(true);
    expect(next.currentSeat).toBe(me);
    expect(validateDuelMove(next, me, { type: "REFILL" }).ok).toBe(false);
  });
});

describe("reserving", () => {
  it("takes a Gold, keeps the card hidden, and deals the pyramid's gap from the deck", () => {
    const state = flat("mind");
    state.board[4] = GOLD;
    const cardId = state.pyramid[2][1]!;
    const nextTop = state.decks[2][0];
    const next = play(state, me, { type: "RESERVE", from: "pyramid", cardId });
    expect(next.players[me].tokens[GOLD]).toBe(1);
    expect(next.board[4]).toBeNull();
    expect(next.players[me].reserved).toEqual([{ cardId, blind: false }]);
    expect(next.pyramid[2][1]).toBe(nextTop);
    expect(next.decks[2]).toHaveLength(state.decks[2].length - 1);
    expect(next.currentSeat).toBe(other);
  });

  it("from a deck takes its top card blind", () => {
    const state = flat(GOLD);
    const top = state.decks[3][0];
    const next = play(state, me, { type: "RESERVE", from: "deck", level: 3 });
    expect(next.players[me].reserved).toEqual([{ cardId: top, blind: true }]);
  });
});

describe("buying", () => {
  it("pays with tokens less bonuses, Gold for the rest, into the bag, and takes the card", () => {
    const cardId = base.pyramid[1][0]!;
    const card = getDuelCard(cardId);
    const cost = Object.values(card.cost).reduce((a, b) => a + b, 0);
    const state = withPlayer(base, me, { tokens: { ...emptyTokens(), [GOLD]: cost } });
    const next = play(state, me, { type: "BUY", cardId });
    expect(next.players[me].tokens[GOLD]).toBe(0);
    expect(next.bag.filter((t) => t === GOLD)).toHaveLength(cost);
    expect(next.players[me].cards).toEqual([{ cardId }]);
    expect(next.pyramid[1][0]).not.toBe(cardId);
  });

  it("buys from the reserve too", () => {
    const cardId = "d1-01";
    const state = withPlayer(base, me, { reserved: [{ cardId, blind: true }], tokens: { ...emptyTokens(), [GOLD]: 9 } });
    const next = play(state, me, { type: "BUY", cardId });
    expect(next.players[me].reserved).toEqual([]);
    expect(next.players[me].cards).toEqual([{ cardId }]);
  });

  it("a wild card joins the one color you own, or asks which when there are two", () => {
    const wild = "d1-26";
    const rich = { tokens: { ...emptyTokens(), [GOLD]: 9 } };
    const one = withPlayer({ ...base, pyramid: { ...base.pyramid, 1: [wild, null, null, null, null] } }, me, { ...rich, cards: [{ cardId: "d1-01" }] });
    const joined = play(one, me, { type: "BUY", cardId: wild });
    expect(joined.players[me].cards[1]).toEqual({ cardId: wild, joined: getDuelCard("d1-01").bonus });
    expect(joined.pending).toBeNull();

    const two = withPlayer({ ...base, pyramid: { ...base.pyramid, 1: [wild, null, null, null, null] } }, me, { ...rich, cards: [{ cardId: "d1-01" }, { cardId: "d1-06" }] });
    const asking = play(two, me, { type: "BUY", cardId: wild });
    expect(asking.pending).toEqual({ type: "PICK_JOIN_COLOR", cardId: wild });
    const answered = play(asking, me, { type: "PICK_JOIN_COLOR", color: getDuelCard("d1-06").bonus as "space" });
    expect(answered.players[me].cards[2].joined).toBe(getDuelCard("d1-06").bonus);
    expect(answered.currentSeat).toBe(other);
  });
});

describe("powers", () => {
  const buyWith = (cardId: string, state = base) =>
    withPlayer({ ...state, pyramid: { ...state.pyramid, [getDuelCard(cardId).level]: [cardId, null, null, null, null].slice(0, state.pyramid[getDuelCard(cardId).level].length) } }, me, {
      tokens: { ...emptyTokens(), [GOLD]: 9 },
      cards: [{ cardId: "d1-01" }],
    });

  it("another turn keeps the seat", () => {
    const id = ["d1-03", "d1-08", "d1-13"].find((i) => getDuelCard(i).ability === "again")!;
    const next = play(buyWith(id), me, { type: "BUY", cardId: id });
    expect(next.currentSeat).toBe(me);
    expect(next.extraTurn).toBe(false);
  });

  it("take a token of this color asks for one, or does nothing with none on the board", () => {
    const id = ["d1-04", "d1-09", "d1-14"].find((i) => getDuelCard(i).ability === "token")!;
    const color = getDuelCard(id).bonus as "mind";
    const withColor = buyWith(id, flat(color));
    const asking = play(withColor, me, { type: "BUY", cardId: id });
    expect(asking.pending).toEqual({ type: "PICK_TOKEN", color, reason: "token" });
    const picked = play(asking, me, { type: "PICK_TOKEN", space: 0 });
    expect(picked.players[me].tokens[color]).toBe(1);
    expect(picked.currentSeat).toBe(other);
    const none = play(buyWith(id, flat(GOLD)), me, { type: "BUY", cardId: id });
    expect(none.pending).toBeNull();
  });

  it("take a Privilege takes one from the table, and from the opponent when the table is empty", () => {
    const id = ["d2-03", "d2-07", "d2-11"].find((i) => getDuelCard(i).ability === "privilege")!;
    const next = play(buyWith(id), me, { type: "BUY", cardId: id });
    expect(next.players[me].privileges).toBe(1);
    expect(next.privileges).toBe(1);
  });

  it("steal asks for one of the opponent's tokens, never Gold, or nothing when they hold none", () => {
    const id = ["d2-02", "d2-06", "d2-10"].find((i) => getDuelCard(i).ability === "steal")!;
    const victim = withPlayer(buyWith(id), other, { tokens: { ...emptyTokens(), reality: 2, [GOLD]: 1 } });
    const asking = play(victim, me, { type: "BUY", cardId: id });
    expect(asking.pending).toEqual({ type: "PICK_OPPONENT_TOKEN" });
    expect(validateDuelMove(asking, me, { type: "PICK_OPPONENT_TOKEN", color: GOLD }).ok).toBe(false);
    const stolen = play(asking, me, { type: "PICK_OPPONENT_TOKEN", color: "reality" });
    expect(stolen.players[other].tokens.reality).toBe(1);
    expect(stolen.players[me].tokens.reality).toBe(1);
    const broke = withPlayer(buyWith(id), other, { tokens: { ...emptyTokens(), [GOLD]: 1 } });
    expect(play(broke, me, { type: "BUY", cardId: id }).pending).toBeNull();
  });

});

describe("Royals and the wins", () => {
  it("asks for a Royal at three crowns and a second at six, each power resolving", () => {
    // Two crowned cards owned, a third crown bought.
    const crowned = ["d3-01", "d3-02"]; // level 3, 2 crowns each
    const state = withPlayer({ ...base, pyramid: { ...base.pyramid, 1: ["d1-02", null, null, null, null] } }, me, {
      cards: [{ cardId: crowned[0] }],
      tokens: { ...emptyTokens(), [GOLD]: 9 },
    });
    expect(crownsOf(state.players[me])).toBe(2);
    const asking = play(state, me, { type: "BUY", cardId: "d1-02" }); // 1 crown
    expect(asking.pending).toEqual({ type: "PICK_ROYAL" });
    const royal = asking.royals.find((r) => r === "r-2")!; // again
    const taken = play(asking, me, { type: "PICK_ROYAL", royalId: royal });
    expect(taken.players[me].royals).toEqual([royal]);
    expect(taken.royals).not.toContain(royal);
    expect(taken.currentSeat).toBe(me); // the Royal's power: another turn
  });

  it("ends the game at once when the player reaches 20 points", () => {
    // Three 4-point cards with 6 crowns, and the two Royals those crowns already earned: 16 points.
    const state = withPlayer({ ...base, pyramid: { ...base.pyramid, 3: ["d3-13", null, null] }, royals: ["r-2", "r-4"] }, me, {
      cards: [{ cardId: "d3-02" }, { cardId: "d3-04" }, { cardId: "d3-06" }],
      royals: ["r-1", "r-3"],
      tokens: { ...emptyTokens(), [GOLD]: 9 },
    });
    expect(pointsOf(state.players[me])).toBe(16);
    const next = play(state, me, { type: "BUY", cardId: "d3-13" }); // 6 points, no bonus
    expect(next.status).toBe("finished");
    expect(next.winnerSeat).toBe(me);
    expect(validateDuelMove(next, other, { type: "REFILL" }).ok).toBe(false);
  });
});

describe("timeouts and forfeits", () => {
  it("a timeout resolves what is pending and ends the turn; a forfeit hands the game to the other player", () => {
    const over = withPlayer({ ...base, pending: { type: "RETURN_TOKENS", mustReturn: 1 } }, me, { tokens: { ...emptyTokens(), mind: 11 } });
    const skipped = applyDuelMove(over, me, { type: "TIMEOUT_SKIP" });
    expect(skipped.pending).toBeNull();
    expect(skipped.players[me].tokens.mind).toBe(10);
    expect(skipped.currentSeat).toBe(other);
    const quit = applyDuelMove(base, me, { type: "FORFEIT" });
    expect(quit.status).toBe("finished");
    expect(quit.winnerSeat).toBe(other);
  });
});

describe("the game clock", () => {
  const starter = base.startingSeat;
  const second = 1 - starter;
  // A flat board, the second player up, the starter six points ahead on a card with no bonus.
  const table = withPlayer({ ...flat("mind"), currentSeat: second }, starter, { cards: [{ cardId: "d3-13" }] });

  it("lets the second player finish their turn, then ends on points", () => {
    const expired = play(table, second, { type: "END_BY_CLOCK" });
    expect(expired.status).toBe("active");
    expect(expired.clockExpired).toBe(true);
    const done = play(expired, second, { type: "TAKE_LINE", spaces: [TOP[0]] });
    expect(done.status).toBe("finished");
    expect(done.winnerSeat).toBe(starter);
  });

  it("ends at once when the starting player is up, and level is a draw", () => {
    const level = { ...flat("mind"), currentSeat: starter };
    const done = play(level, starter, { type: "END_BY_CLOCK" });
    expect(done.status).toBe("finished");
    expect(done.winnerSeat).toBeNull();
  });
});
