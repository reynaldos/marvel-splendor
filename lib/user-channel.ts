/** A player's private Pusher channel, shared by the server trigger, the auth route and the browser. */
export const FRIENDS_UPDATED_EVENT = "friends-updated";

export function userChannel(userId: string): string {
  return `private-user-${userId}`;
}
