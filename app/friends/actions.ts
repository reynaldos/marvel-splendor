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

/** A row id as the browser sent it; anything odd is treated as a row that isn't there. */
const idSchema = z.string().min(1).max(64);
const usernameSchema = z.string().max(100);

async function signedInUser() {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/friends");
  return getOrCreateUser(session.user);
}

/** Runs one friends change for the signed-in player and tells the page to reload its data. */
async function change(run: (userId: string) => Promise<FriendResult>): Promise<FriendResult> {
  const user = await signedInUser();
  const result = await run(user.id);
  if ("ok" in result) refresh();
  return result;
}

/** Sends a request to the player with this username. */
export async function sendFriendRequestAction(username: string): Promise<FriendResult> {
  const typed = usernameSchema.safeParse(username);
  if (!typed.success) return { error: "No player has that username." };
  return change((userId) => sendFriendRequest(userId, typed.data));
}

/** Accepts or declines a request sent to the signed-in player. */
export async function respondFriendRequestAction(requestId: string, accept: boolean): Promise<FriendResult> {
  const id = idSchema.safeParse(requestId);
  if (!id.success || typeof accept !== "boolean") return { error: NOT_FOUND };
  return change((userId) => respondFriendRequest(userId, id.data, accept));
}

/** Takes back a request the signed-in player sent. */
export async function cancelFriendRequestAction(requestId: string): Promise<FriendResult> {
  const id = idSchema.safeParse(requestId);
  if (!id.success) return { error: NOT_FOUND };
  return change((userId) => cancelFriendRequest(userId, id.data));
}

/** Ends a friendship. */
export async function removeFriendAction(friendId: string): Promise<FriendResult> {
  const id = idSchema.safeParse(friendId);
  if (!id.success) return { error: NOT_FOUND };
  return change((userId) => removeFriend(userId, id.data));
}

/** Blocks a player. */
export async function blockPlayerAction(blockedId: string): Promise<FriendResult> {
  const id = idSchema.safeParse(blockedId);
  if (!id.success) return { error: NOT_FOUND };
  return change((userId) => blockPlayer(userId, id.data));
}

/** Lifts a block. */
export async function unblockPlayerAction(blockedId: string): Promise<FriendResult> {
  const id = idSchema.safeParse(blockedId);
  if (!id.success) return { error: NOT_FOUND };
  return change((userId) => unblockPlayer(userId, id.data));
}
