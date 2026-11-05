"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth0 } from "@/lib/auth0";
import {
  blockPlayer,
  cancelFriendRequest,
  type FriendResult,
  removeFriend,
  respondFriendRequest,
  sendFriendRequest,
  unblockPlayer,
} from "@/lib/friends";
import { NOT_FOUND } from "@/lib/friend-rules";
import { getOrCreateUser } from "@/lib/get-or-create-user";

const idSchema = z.string().min(1).max(64);
const usernameSchema = z.string().max(100);

async function signedInUser() {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/friends");
  return getOrCreateUser(session.user);
}

/** Checks the session first, then runs one friends change for the player and tells the page to reload its data. */
async function change(run: (userId: string) => Promise<FriendResult>): Promise<FriendResult> {
  const user = await signedInUser();
  const result = await run(user.id);
  if ("ok" in result) refresh();
  return result;
}

/** Runs a change on a row id as the browser sent it; an odd id is a row that isn't there. */
function withId(raw: string, run: (userId: string, id: string) => Promise<FriendResult>): Promise<FriendResult> {
  return change(async (userId) => {
    const id = idSchema.safeParse(raw);
    return id.success ? run(userId, id.data) : { error: NOT_FOUND };
  });
}

/** Sends a request to the player with this username. */
export async function sendFriendRequestAction(username: string): Promise<FriendResult> {
  return change(async (userId) => {
    const typed = usernameSchema.safeParse(username);
    return typed.success ? sendFriendRequest(userId, typed.data) : { error: "No player has that username." };
  });
}

/** Accepts or declines a request sent to the signed-in player. */
export async function respondFriendRequestAction(requestId: string, accept: boolean): Promise<FriendResult> {
  return withId(requestId, async (userId, id) => (typeof accept === "boolean" ? respondFriendRequest(userId, id, accept) : { error: NOT_FOUND }));
}

/** Takes back a request the signed-in player sent. */
export async function cancelFriendRequestAction(requestId: string): Promise<FriendResult> {
  return withId(requestId, cancelFriendRequest);
}

/** Ends a friendship. */
export async function removeFriendAction(friendId: string): Promise<FriendResult> {
  return withId(friendId, removeFriend);
}

/** Blocks a player. */
export async function blockPlayerAction(blockedId: string): Promise<FriendResult> {
  return withId(blockedId, blockPlayer);
}

/** Lifts a block. */
export async function unblockPlayerAction(blockedId: string): Promise<FriendResult> {
  return withId(blockedId, unblockPlayer);
}
