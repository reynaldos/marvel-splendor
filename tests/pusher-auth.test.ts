import { beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ current: null as { user: { sub: string } } | null }));
vi.mock("@/lib/auth0", () => ({ auth0: { getSession: vi.fn(async () => session.current) } }));
vi.mock("@/lib/get-or-create-user", () => ({ getOrCreateUser: vi.fn(async () => ({ id: "me" })) }));
vi.mock("pusher", () => ({
  default: class {
    authorizeChannel(socketId: string, channel: string) {
      return { auth: `signed:${socketId}:${channel}` };
    }
    trigger = vi.fn();
  },
}));

import { POST } from "@/app/api/pusher/auth/route";

const ask = (channel: string) =>
  POST(new Request("http://x/api/pusher/auth", { method: "POST", body: new URLSearchParams({ socket_id: "1.2", channel_name: channel }) }));

beforeEach(() => {
  session.current = { user: { sub: "auth0|me" } };
  Object.assign(process.env, { PUSHER_APP_ID: "id", PUSHER_SECRET: "s", NEXT_PUBLIC_PUSHER_KEY: "k", NEXT_PUBLIC_PUSHER_CLUSTER: "c" });
});

describe("POST /api/pusher/auth", () => {
  it("signs the player's own channel", async () => {
    const response = await ask("private-user-me");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ auth: "signed:1.2:private-user-me" });
  });

  it("refuses anyone else's channel, and anyone not signed in", async () => {
    expect((await ask("private-user-someone")).status).toBe(403);
    expect((await ask("game-abc")).status).toBe(403);
    session.current = null;
    expect((await ask("private-user-me")).status).toBe(401);
  });
});
