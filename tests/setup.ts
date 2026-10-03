import { vi } from "vitest";

// Rule tests pin cards and locations by id and rely on their exact costs, so
// they run against frozen copies rather than the live files in data/, which
// the project owner edits. Tests that are about the real data opt back in
// with vi.unmock(...).
vi.mock("@/data/cards.json", async () => import("./fixtures/cards.json"));
vi.mock("@/data/locations.json", async () => import("./fixtures/locations.json"));
vi.mock("@/data/packs.json", async () => import("./fixtures/packs.json"));
