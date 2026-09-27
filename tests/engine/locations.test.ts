import { describe, expect, it } from "vitest";
import { applyMove } from "@/lib/engine/apply";
import { validateMove } from "@/lib/engine/validate";
import { getCard, getLocation } from "@/lib/engine/data";
import type { Move } from "@/lib/engine/types";
import { emptyStones, emptyTokens } from "@/lib/engine/types";
import { makePlayer, makeState } from "./helpers";

// loc-02a Wakanda: requires { mind: 4, space: 4 }, 3 pts
// loc-03a Xavier's School: requires { mind: 4, power: 4 }, 3 pts
// Both share `mind: 4`, so a player who is one `mind` bonus away from both
// (and already has space:4 and power:4 bonuses) will tie when recruiting a
// mind-bonus card, per ARCHITECTURE.md's "their choice if several qualify".
const WAKANDA = "loc-02a";
const XAVIERS = "loc-03a";

describe("Location auto-claim", () => {
  it("auto-claims the single Location a player's bonuses now satisfy", () => {
    const card = getCard("c1-17"); // bonus: mind, cost { space:1, soul:1, reality:1, power:1 }
    const state = makeState(2, {
      locations: [WAKANDA],
      market: { 1: [card.id, null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
      players: [
        makePlayer(0, {
          bonuses: { ...emptyStones(), mind: 3, space: 4 }, // recruiting c1-17 brings mind to 4
          tokens: { ...emptyTokens(), soul: 1, reality: 1, power: 1 }, // space cost already covered by bonus
        }),
        makePlayer(1),
      ],
    });
    const move: Move = { type: "RECRUIT", from: "market", cardId: card.id };
    const next = applyMove(state, 0, move);
    expect(next.players[0].locations).toEqual([WAKANDA]);
    expect(next.players[0].points).toBe(getLocation(WAKANDA).points + card.points);
    expect(next.locations).toEqual([]);
    expect(next.pending).toBeNull();
  });

  it("does not claim a Location whose requirement isn't yet met", () => {
    const card = getCard("c1-17");
    const state = makeState(2, {
      locations: [WAKANDA],
      market: { 1: [card.id, null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
      players: [
        makePlayer(0, {
          bonuses: { ...emptyStones(), mind: 3, space: 2 }, // space still short of 4
          tokens: { ...emptyTokens(), space: 1, soul: 1, reality: 1, power: 1 },
        }),
        makePlayer(1),
      ],
    });
    const move: Move = { type: "RECRUIT", from: "market", cardId: card.id };
    const next = applyMove(state, 0, move);
    expect(next.players[0].locations).toEqual([]);
    expect(next.locations).toEqual([WAKANDA]);
  });

  it("creates a CHOOSE_LOCATION pending when a move satisfies two Locations at once", () => {
    const card = getCard("c1-17"); // bonus: mind, cost { space:1, soul:1, reality:1, power:1 }
    const state = makeState(2, {
      locations: [WAKANDA, XAVIERS],
      market: { 1: [card.id, null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
      players: [
        makePlayer(0, {
          bonuses: { ...emptyStones(), mind: 3, space: 4, power: 4 },
          tokens: { ...emptyTokens(), soul: 1, reality: 1 }, // space/power costs already covered by bonus
        }),
        makePlayer(1),
      ],
    });
    const move: Move = { type: "RECRUIT", from: "market", cardId: card.id };
    const next = applyMove(state, 0, move);
    expect(next.pending).toEqual({ type: "CHOOSE_LOCATION", options: [WAKANDA, XAVIERS] });
    expect(next.currentSeat).toBe(0); // turn doesn't advance until resolved
    expect(next.locations).toEqual([WAKANDA, XAVIERS]); // neither claimed yet

    // Only the offered options are legal.
    expect(validateMove(next, 0, { type: "CHOOSE_LOCATION", locationId: "loc-01a" }).ok).toBe(false);
    expect(validateMove(next, 0, { type: "CHOOSE_LOCATION", locationId: WAKANDA }).ok).toBe(true);

    const resolved = applyMove(next, 0, { type: "CHOOSE_LOCATION", locationId: WAKANDA });
    expect(resolved.players[0].locations).toEqual([WAKANDA]);
    expect(resolved.locations).toEqual([XAVIERS]); // the unchosen one stays available
    expect(resolved.pending).toBeNull();
    expect(resolved.currentSeat).toBe(1);
  });

  it("still runs the hand-limit check after a Location choice is resolved (Location precedes hand-limit in turn order)", () => {
    // A reachable edge case: a free (bonus-covered) first Level-3 recruit
    // grants a Time Stone token while the player is already at the 10-token
    // limit, and simultaneously ties two Locations. The engine must offer
    // CHOOSE_LOCATION first, and only *after* that's resolved discover the
    // player is now over the hand limit.
    const card = getCard("c3-01"); // cost mind3/space3/soul5/reality3, bonus power
    const state = makeState(2, {
      locations: [WAKANDA, XAVIERS], // requires mind4/space4, and mind4/power4
      market: { 1: [null, null, null, null], 2: [null, null, null, null], 3: [card.id, null, null, null] },
      players: [
        makePlayer(0, {
          bonuses: { ...emptyStones(), mind: 4, space: 4, soul: 5, reality: 3, power: 3 },
          tokens: { ...emptyTokens(), mind: 5, space: 5 }, // 10 tokens, none needed to pay
        }),
        makePlayer(1),
      ],
    });
    const move: Move = { type: "RECRUIT", from: "market", cardId: card.id };
    const next = applyMove(state, 0, move);

    expect(next.players[0].tokens.time).toBe(1); // Time Stone granted (free recruit didn't spend it away)
    expect(next.pending).toEqual({ type: "CHOOSE_LOCATION", options: [WAKANDA, XAVIERS] });

    const resolved = applyMove(next, 0, { type: "CHOOSE_LOCATION", locationId: WAKANDA });
    expect(resolved.pending).toEqual({ type: "RETURN_TOKENS", mustReturn: 1 });
    expect(resolved.currentSeat).toBe(0); // still blocked, turn hasn't advanced
  });
});
