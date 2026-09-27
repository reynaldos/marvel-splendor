import { describe, expect, it, vi } from "vitest";

// lib/lobby.ts pulls in Prisma at import time; these helpers never touch it.
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/generated/prisma/client", () => ({ Prisma: {} }));

import { nextFreeSeat, normalizeJoinCode } from "@/lib/lobby";

describe("normalizeJoinCode", () => {
  it("accepts any case and surrounding whitespace", () => {
    expect(normalizeJoinCode("  abc234 ")).toBe("ABC234");
  });
  it("rejects wrong lengths and symbols", () => {
    expect(normalizeJoinCode("ABC23")).toBeNull();
    expect(normalizeJoinCode("ABC2345")).toBeNull();
    expect(normalizeJoinCode("ABC-23")).toBeNull();
  });
});

describe("nextFreeSeat", () => {
  it("fills the lowest gap first", () => {
    expect(nextFreeSeat([])).toBe(0);
    expect(nextFreeSeat([0, 2])).toBe(1);
  });
  it("returns null when all four seats are taken", () => {
    expect(nextFreeSeat([0, 1, 2, 3])).toBeNull();
  });
});
