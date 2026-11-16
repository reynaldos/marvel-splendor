import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth0", () => ({ auth0: { getSession: vi.fn(async () => ({ user: { sub: "auth0|me" } })) } }));
vi.mock("@/lib/get-or-create-user", () => ({ getOrCreateUser: vi.fn(async () => ({ id: "me" })) }));
vi.mock("@/lib/friends", () => ({}));
vi.mock("@/lib/invites", () => ({ respondInvite: vi.fn(), sendInvite: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/lobby", () => ({ OPEN_GAMES_REASON: "Too many games.", createLobby: vi.fn(async () => "new-room"), openLobbyFor: vi.fn(async () => null) }));

import { inviteToNewRoomAction } from "@/app/friends/actions";
import { NOT_FOUND } from "@/lib/friend-rules";
import { sendInvite } from "@/lib/invites";
import { createLobby, openLobbyFor } from "@/lib/lobby";
import { roomSettings } from "@/lib/lobby-rules";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

beforeEach(() => vi.clearAllMocks());

describe("roomSettings", () => {
  it("keeps the original game's choices on offer, else the first", () => {
    expect(roomSettings(false, form({ turnTimeSeconds: "45", targetPoints: "18", gameTimeMinutes: "20" }))).toEqual({ targetPoints: 18, turnTimeSeconds: 45, gameTimeMinutes: 20 });
    expect(roomSettings(false, form({ turnTimeSeconds: "999", targetPoints: "x", gameTimeMinutes: "off" }))).toEqual({ targetPoints: 16, turnTimeSeconds: 30, gameTimeMinutes: null });
  });

  it("makes a Duel room, where turn time may be off", () => {
    expect(roomSettings(true, form({ turnTimeSeconds: "off", gameTimeMinutes: "10" }))).toEqual({ rules: "duel", cardSet: "marvel", targetPoints: 20, turnTimeSeconds: null, gameTimeMinutes: 10 });
    expect(roomSettings(true, form({ turnTimeSeconds: "90" })).turnTimeSeconds).toBe(90);
  });
});

describe("inviteToNewRoomAction", () => {
  it("opens a room with the chosen rules, invites the friend, and gives back the room", async () => {
    expect(await inviteToNewRoomAction("friend", true, form({ turnTimeSeconds: "60" }))).toEqual({ ok: true, gameId: "new-room", message: undefined });
    expect(createLobby).toHaveBeenCalledWith("me", expect.objectContaining({ rules: "duel", turnTimeSeconds: 60 }));
    expect(sendInvite).toHaveBeenCalledWith("me", "new-room", "friend");
  });

  it("invites to the room already open instead of opening a second", async () => {
    vi.mocked(openLobbyFor).mockResolvedValueOnce("waiting-room");
    const result = await inviteToNewRoomAction("friend", false, form({}));
    expect(result).toMatchObject({ ok: true, gameId: "waiting-room" });
    expect(createLobby).not.toHaveBeenCalled();
    expect(sendInvite).toHaveBeenCalledWith("me", "waiting-room", "friend");
  });

  it("says why at the open-games cap, and opens nothing", async () => {
    vi.mocked(createLobby).mockRejectedValueOnce(new Error("Too many games."));
    expect(await inviteToNewRoomAction("friend", false, form({}))).toEqual({ error: "Too many games." });
    expect(sendInvite).not.toHaveBeenCalled();
  });

  it("still goes to the new room when the invite itself is refused", async () => {
    vi.mocked(sendInvite).mockResolvedValueOnce({ error: NOT_FOUND });
    expect(await inviteToNewRoomAction("friend", false, form({}))).toEqual({ error: NOT_FOUND, gameId: "new-room" });
  });

  it("refuses an odd id or game choice", async () => {
    expect(await inviteToNewRoomAction("", false, form({}))).toEqual({ error: NOT_FOUND });
    expect(await inviteToNewRoomAction("friend", "duel" as unknown as boolean, form({}))).toEqual({ error: NOT_FOUND });
    expect(createLobby).not.toHaveBeenCalled();
  });
});
