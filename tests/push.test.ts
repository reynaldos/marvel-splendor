import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("web-push", () => ({ default: { setVapidDetails: vi.fn(), sendNotification: vi.fn(async () => ({ statusCode: 201 })) } }));
vi.mock("@/lib/pusher", () => ({ userIsOnline: vi.fn(async () => false) }));

import webpush from "web-push";

import { MAX_DEVICES, pushToUser, saveDevice } from "@/lib/push";
import { userIsOnline } from "@/lib/pusher";

type Device = { id: string; userId: string; endpoint: string; p256dh: string; auth: string; createdAt: Date };
const MESSAGE = { title: "t", body: "b", url: "/friends", tag: "x" };
const KEYS = { NEXT_PUBLIC_VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv", VAPID_SUBJECT: "mailto:a@b.c" };

function fakeDb(opts: { enabled?: boolean; devices?: Device[] } = {}) {
  let devices = opts.devices ?? [];
  const db = {
    user: { findUnique: vi.fn(async () => ({ pushEnabled: opts.enabled ?? true, pushSubscriptions: devices })) },
    pushSubscription: {
      deleteMany: vi.fn(async ({ where }: { where: { id: string | { in: string[] } } }) => {
        const ids = typeof where.id === "string" ? [where.id] : where.id.in;
        devices = devices.filter((d) => !ids.includes(d.id));
      }),
      upsert: vi.fn(async ({ where, create, update }: { where: { endpoint: string }; create: Omit<Device, "id">; update: Partial<Device> }) => {
        const row = devices.find((d) => d.endpoint === where.endpoint);
        if (row) Object.assign(row, update);
        else devices.push({ id: `d${devices.length + 1}`, ...create });
      }),
      findMany: vi.fn(async ({ skip }: { skip: number }) => [...devices].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(skip)),
    },
    get devices() {
      return devices;
    },
  };
  return db;
}
const as = (db: ReturnType<typeof fakeDb>) => db as unknown as Parameters<typeof pushToUser>[2];
const device = (n: number, minutesAgo = 0): Device => ({ id: `d${n}`, userId: "u", endpoint: `https://push/${n}`, p256dh: "k", auth: "a", createdAt: new Date(Date.now() - minutesAgo * 60_000) });

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(process.env, KEYS);
});

describe("pushToUser", () => {
  it("sends to each of the player's devices", async () => {
    await pushToUser("u", MESSAGE, as(fakeDb({ devices: [device(1), device(2)] })));
    expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
    expect(vi.mocked(webpush.sendNotification).mock.calls[0][1]).toBe(JSON.stringify(MESSAGE));
  });

  it("sends nothing with the switch off, with the app open, or without keys", async () => {
    await pushToUser("u", MESSAGE, as(fakeDb({ enabled: false, devices: [device(1)] })));
    vi.mocked(userIsOnline).mockResolvedValueOnce(true);
    await pushToUser("u", MESSAGE, as(fakeDb({ devices: [device(1)] })));
    delete process.env.VAPID_PRIVATE_KEY;
    await pushToUser("u", MESSAGE, as(fakeDb({ devices: [device(1)] })));
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it("drops a device the push service says is gone, keeps one that failed otherwise, and never throws", async () => {
    const db = fakeDb({ devices: [device(1), device(2), device(3)] });
    vi.mocked(webpush.sendNotification)
      .mockRejectedValueOnce(Object.assign(new Error("gone"), { statusCode: 410 }))
      .mockRejectedValueOnce(Object.assign(new Error("busy"), { statusCode: 500 }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(pushToUser("u", MESSAGE, as(db))).resolves.toBeUndefined();
    expect(db.devices.map((d) => d.id)).toEqual(["d2", "d3"]);
  });
});

describe("saveDevice", () => {
  it("keeps one row per device, moved to whoever turned it on last", async () => {
    const db = fakeDb({ devices: [{ ...device(1), userId: "someone" }] });
    await saveDevice("u", { endpoint: "https://push/1", p256dh: "new", auth: "new" }, as(db));
    expect(db.devices).toHaveLength(1);
    expect(db.devices[0]).toMatchObject({ userId: "u", p256dh: "new" });
  });

  it(`keeps the newest ${MAX_DEVICES} devices of a player`, async () => {
    const db = fakeDb({ devices: Array.from({ length: MAX_DEVICES }, (_, n) => device(n + 1, 10 + n)) });
    await saveDevice("u", { endpoint: "https://push/new", p256dh: "k", auth: "a" }, as(db));
    expect(db.devices).toHaveLength(MAX_DEVICES);
    expect(db.devices.some((d) => d.endpoint === "https://push/new")).toBe(true);
    // The oldest, d5, made way.
    expect(db.devices.some((d) => d.id === "d5")).toBe(false);
  });
});
