import { describe, expect, it } from "vitest";

import { canResend, INVITE_MESSAGES, inviteClosedReason, RESEND_AFTER_MS, roomLine } from "@/lib/invite-rules";

const open = { status: "LOBBY", hostAwayUntil: null, taken: 2, seats: 4 };

describe("inviteClosedReason", () => {
  it("is open for a waiting room with a free seat", () => {
    expect(inviteClosedReason(open)).toBeNull();
  });

  it("says why for a started, closed or full room", () => {
    expect(inviteClosedReason({ ...open, status: "ACTIVE" })).toBe(INVITE_MESSAGES.started);
    expect(inviteClosedReason({ ...open, status: "FINISHED" })).toBe(INVITE_MESSAGES.started);
    expect(inviteClosedReason({ ...open, status: "ABANDONED" })).toBe(INVITE_MESSAGES.closed);
    expect(inviteClosedReason({ ...open, taken: 4 })).toBe(INVITE_MESSAGES.full);
  });

  it("closes once the host has been away past their time, not before", () => {
    expect(inviteClosedReason({ ...open, hostAwayUntil: 1_000 }, 999)).toBeNull();
    expect(inviteClosedReason({ ...open, hostAwayUntil: 1_000 }, 1_000)).toBe(INVITE_MESSAGES.closed);
  });

  it("uses the join page's words", () => {
    expect(INVITE_MESSAGES.started).toBe("That game has already started.");
    expect(INVITE_MESSAGES.closed).toBe("That room has closed.");
    expect(INVITE_MESSAGES.full).toBe("That game is full.");
  });
});

describe("roomLine", () => {
  it("names the game and the seats taken", () => {
    expect(roomLine({ duel: false, taken: 2, seats: 4 })).toBe("Marvel game, 2 of 4 seats taken");
    expect(roomLine({ duel: true, taken: 1, seats: 2 })).toBe("Duel, 1 of 2 seats taken");
  });
});

describe("canResend", () => {
  it("waits a full minute after the last send", () => {
    expect(canResend(1_000, 1_000 + RESEND_AFTER_MS - 1)).toBe(false);
    expect(canResend(1_000, 1_000 + RESEND_AFTER_MS)).toBe(true);
  });
});
