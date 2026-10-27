import { describe, expect, it } from "vitest";


import { getDuelCard } from "@/lib/duel/data";
import { legalDuelMoves } from "@/lib/duel/legal-moves";
import { bonusesOf, buyCost, canBuy, hasWon, lineOwesPrivilege, pointsOf } from "@/lib/duel/rules";
import { createDuel } from "@/lib/duel/setup";
import { GOLD, PEARL, emptyTokens, type DuelPlayer, type DuelState } from "@/lib/duel/types";
import { validateDuelMove } from "@/lib/duel/validate";

const base = createDuel("moves-test");
const me = base.currentSeat;
const other = 1 - me;
const withPlayer = (state: DuelState, seat: number, over: Partial<DuelPlayer>): DuelState => {
  const players = [...state.players] as DuelState["players"];
  players[seat] = { ...players[seat], ...over };
  return { ...state, players };
};
const ok = (r: { ok: boolean }) => r.ok;

describe("rules", () => {
  it("counts bonuses from owned cards, a wild card as the color it joined, double cards twice", () => {
    const red = getDuelCard("d1-01"); // level 1, reality... whichever: read its bonus
    const double = "d2-04"; // a double-bonus card
    const wild = "d1-26"; // a many-gem card
    const player: DuelPlayer = { ...base.players[0], cards: [{ cardId: red.id }, { cardId: double }, { cardId: wild, joined: "mind" }] };
    const b = bonusesOf(player);
    expect(b[red.bonus as "mind"]).toBeGreaterThanOrEqual(1);
    expect(b[getDuelCard(double).bonus as "mind"]).toBeGreaterThanOrEqual(2);
    expect(b.mind).toBeGreaterThanOrEqual(1);
  });

  it("prices a card less bonuses, Pearls at full, and Gold covering the rest", () => {
    const card = getDuelCard("d1-03"); // cost includes a pearl
    expect(card.cost.time).toBe(1);
    const broke: DuelPlayer = { ...base.players[0], tokens: emptyTokens() };
    expect(canBuy(card.id, broke)).toBe(false);
    const rich: DuelPlayer = { ...broke, tokens: { ...emptyTokens(), [GOLD]: 10 } };
    expect(canBuy(card.id, rich)).toBe(true);
    expect(buyCost(card.id, rich).pay[GOLD]).toBe(Object.values(card.cost).reduce((a, b) => a + b, 0));
  });

  it("knows the three wins, each needing a card of every color, and that reserved cards count for nothing", () => {
    // Mind, space and soul cards, a wild joined to power, and no reality: 20 points but a color short.
    const short: DuelPlayer = { ...base.players[0], cards: [{ cardId: "d3-13" }, { cardId: "d3-12", joined: "power" }, { cardId: "d3-01" }, { cardId: "d3-02" }, { cardId: "d3-03" }, { cardId: "d3-05" }, { cardId: "d2-24" }] };
    expect(pointsOf(short)).toBeGreaterThanOrEqual(20);
    expect(hasWon(short)).toBe(false);
    const p: DuelPlayer = { ...short, cards: [...short.cards, { cardId: "d1-21" }] };
    expect(hasWon(p)).toBe(true);
    const reservedOnly: DuelPlayer = { ...base.players[0], reserved: p.cards.map((c) => ({ cardId: c.cardId, blind: false })) };
    expect(hasWon(reservedOnly)).toBe(false);
  });

  it("owes a Privilege for three of a color or two Pearls, not otherwise", () => {
    expect(lineOwesPrivilege(["mind", "mind", "mind"])).toBe(true);
    expect(lineOwesPrivilege([PEARL, PEARL])).toBe(true);
    expect(lineOwesPrivilege(["mind", "mind", PEARL])).toBe(false);
    expect(lineOwesPrivilege(["mind"])).toBe(false);
  });
});

describe("validating a turn's moves", () => {
  it("lets the first player take a line, reserve with Gold, and refuses the rest of the table", () => {
    const line = legalDuelMoves(base, me).find((m) => m.type === "TAKE_LINE" && m.spaces.length === 3)!;
    expect(ok(validateDuelMove(base, me, line))).toBe(true);
    expect(validateDuelMove(base, other, line).ok).toBe(false);
    expect(ok(validateDuelMove(base, me, { type: "RESERVE", from: "deck", level: 1 }))).toBe(true);
  });

  it("allows a Privilege spend only before acting and only when held; a refill once and only with a bag", () => {
    expect(validateDuelMove(base, me, { type: "SPEND_PRIVILEGE" }).ok).toBe(false); // first player holds none
    const holder = withPlayer(base, me, { privileges: 1 });
    expect(ok(validateDuelMove(holder, me, { type: "SPEND_PRIVILEGE" }))).toBe(true);
    expect(validateDuelMove(base, me, { type: "REFILL" }).ok).toBe(false); // bag empty, board full
    const gap: DuelState = { ...base, board: base.board.map((t, i) => (i === 0 ? null : t)), bag: ["mind"] };
    expect(ok(validateDuelMove(gap, me, { type: "REFILL" }))).toBe(true);
    expect(validateDuelMove({ ...gap, refilled: true }, me, { type: "REFILL" }).ok).toBe(false);
  });

  it("refuses a reserve with no Gold on the board or three already held, and a buy that cannot be paid", () => {
    const noGold: DuelState = { ...base, board: base.board.map((t) => (t === GOLD ? "mind" : t)) };
    expect(validateDuelMove(noGold, me, { type: "RESERVE", from: "deck", level: 1 }).ok).toBe(false);
    const full = withPlayer(base, me, { reserved: [{ cardId: "d1-01", blind: false }, { cardId: "d1-02", blind: false }, { cardId: "d1-03", blind: false }] });
    expect(validateDuelMove(full, me, { type: "RESERVE", from: "deck", level: 1 }).ok).toBe(false);
    const inPyramid = base.pyramid[3][0]!;
    expect(validateDuelMove(base, me, { type: "BUY", cardId: inPyramid }).ok).toBe(false);
  });

  it("refuses a wild card with no colored card to join, allows it with one", () => {
    const wild = "d1-26";
    const rich = withPlayer(base, me, { tokens: { ...emptyTokens(), [GOLD]: 10 } });
    const pyramid = { ...rich.pyramid, 1: [wild, ...rich.pyramid[1].slice(1)] };
    const withWild: DuelState = { ...rich, pyramid };
    expect(validateDuelMove(withWild, me, { type: "BUY", cardId: wild }).ok).toBe(false);
    const owner = withPlayer(withWild, me, { cards: [{ cardId: "d1-01" }] });
    expect(ok(validateDuelMove(owner, me, { type: "BUY", cardId: wild }))).toBe(true);
  });

  it("holds the turn to a pending choice and checks its answer", () => {
    const picking: DuelState = { ...base, pending: { type: "PICK_TOKEN", reason: "privilege" } };
    expect(validateDuelMove(picking, me, { type: "REFILL" }).ok).toBe(false);
    const goldSpace = base.board.indexOf(GOLD);
    expect(validateDuelMove(picking, me, { type: "PICK_TOKEN", space: goldSpace }).ok).toBe(false);
    const stoneSpace = base.board.findIndex((t) => t && t !== GOLD);
    expect(ok(validateDuelMove(picking, me, { type: "PICK_TOKEN", space: stoneSpace }))).toBe(true);
    const over: DuelState = withPlayer({ ...base, pending: { type: "RETURN_TOKENS", mustReturn: 2 } }, me, { tokens: { ...emptyTokens(), mind: 6, space: 6 } });
    expect(validateDuelMove(over, me, { type: "RETURN_TOKENS", tokens: { mind: 1 } }).ok).toBe(false);
    expect(ok(validateDuelMove(over, me, { type: "RETURN_TOKENS", tokens: { mind: 1, space: 1 } }))).toBe(true);
  });
});

describe("listing legal moves", () => {
  it("lists only valid moves, and every listed kind the turn allows", () => {
    const moves = legalDuelMoves(base, me);
    expect(moves.every((m) => validateDuelMove(base, me, m).ok)).toBe(true);
    const kinds = new Set(moves.map((m) => m.type));
    expect(kinds.has("TAKE_LINE")).toBe(true);
    expect(kinds.has("RESERVE")).toBe(true);
    expect(legalDuelMoves(base, other)).toEqual([]);
  });

  it("offers only the answers while a choice is pending", () => {
    const picking: DuelState = { ...base, pending: { type: "PICK_TOKEN", color: "mind", reason: "token" } };
    const answers = legalDuelMoves(picking, me);
    expect(answers.length).toBe(base.board.filter((t) => t === "mind").length);
    expect(answers.every((m) => m.type === "PICK_TOKEN" && picking.board[m.space] === "mind")).toBe(true);
  });

  it("lists every way to return tokens, each returning the right number", () => {
    const over: DuelState = withPlayer({ ...base, pending: { type: "RETURN_TOKENS", mustReturn: 2 } }, me, { tokens: { ...emptyTokens(), mind: 2, space: 1 } });
    const ways = legalDuelMoves(over, me);
    expect(ways).toHaveLength(2); // mind 2, or mind 1 + space 1
    expect(ways.every((m) => validateDuelMove(over, me, m).ok)).toBe(true);
  });
});

