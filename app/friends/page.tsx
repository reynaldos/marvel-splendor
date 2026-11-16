import { redirect } from "next/navigation";

import {
  blockPlayerAction,
  cancelFriendRequestAction,
  declineInviteAction,
  inviteToNewRoomAction,
  removeFriendAction,
  respondFriendRequestAction,
  sendFriendRequestAction,
  unblockPlayerAction,
} from "@/app/friends/actions";
import { FriendsScreen } from "@/components/friends/FriendsScreen";
import { PushPrompt } from "@/components/PushPrompt";
import { TopBar } from "@/components/TopBar";
import { auth0 } from "@/lib/auth0";
import { loadFriends } from "@/lib/friends";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("Friends", "Your friends, who is online, and requests waiting.", true);

export default async function FriendsPage() {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/friends");
  const user = await getOrCreateUser(session.user);
  const view = await loadFriends(user.id);

  return (
    <>
      <TopBar />
      {/* Asked once, and only of a player who has someone to hear from. */}
      <PushPrompt wanted={user.pushEnabled && view.friends.length + view.received.length > 0} />
      <FriendsScreen
        userId={user.id}
        initial={view}
        actions={{
          send: sendFriendRequestAction,
          respond: respondFriendRequestAction,
          cancel: cancelFriendRequestAction,
          remove: removeFriendAction,
          block: blockPlayerAction,
          unblock: unblockPlayerAction,
          declineInvite: declineInviteAction,
          inviteToRoom: inviteToNewRoomAction,
        }}
      />
    </>
  );
}
