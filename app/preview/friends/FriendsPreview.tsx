"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "cn";
import { toast } from "sonner";

import { FriendButton } from "@/components/friends/FriendButton";
import { showInviteToast, showRequestToast } from "@/components/friends/FriendNotices";
import { FriendsButton } from "@/components/friends/FriendsButton";
import { FriendsScreen, TAB_NAMES, type Tab } from "@/components/friends/FriendsScreen";
import { InviteDialog } from "@/components/friends/InviteDialog";
import { InviteFriends } from "@/components/lobby/InviteFriends";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { Stage, StageRows } from "@/components/Stage";
import { TopBarView } from "@/components/TopBarView";
import type { FriendStanding } from "@/lib/friend-rules";
import { FRAME_TIER_NAMES } from "@/lib/frame-tier";
import type { FriendResult } from "@/lib/friends";

import { MENU_LIT, MENU_PILL, MENU_PLAIN, MenuSection, PreviewMenu } from "../PreviewBar";
import { fakeStore, fakeView, INVITES, PLAYERS, SELF } from "./fake";

const HEADING = "font-display text-sm font-black tracking-widest text-gold-400 uppercase";
const STANDINGS: Array<Exclude<FriendStanding, "hidden">> = ["none", "sent", "received", "friends"];

/** The menu's ways round the page, each an address so it can be shared. */
const VIEWS = [
  { name: "Friends tab", href: "/preview/friends" },
  { name: "Requests tab", href: "/preview/friends?tab=requests" },
  { name: "Blocked tab", href: "/preview/friends?tab=blocked" },
  { name: "Empty", href: "/preview/friends?state=empty" },
  { name: "Buttons", href: "/preview/friends?show=buttons" },
  { name: "Invite", href: "/preview/friends?show=invite" },
];

const BUTTON = "flex h-10 items-center justify-center rounded-full bg-cosmos-950 px-4 text-sm font-black ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-700";
const nothing = async () => {};

/** Answers a profile button after a short wait, as the server would. */
const pretend =
  (message?: string) =>
  async (): Promise<FriendResult> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { ok: true, message };
  };

function PreviewTopBar() {
  return (
    <TopBarView
      username={SELF.username}
      avatarUrl={null}
      tier={FRAME_TIER_NAMES[0]}
      progress={{ level: 4, into: 30, span: 100 }}
      rating={1012}
      wins={7}
      coins={240}
      isAdmin={false}
      newFeedback={false}
      dailyBonus={{ day: 3, claimable: false, unlocksAt: null }}
      onClaimDailyBonus={async () => 0}
      onDeleteAccount={async () => {}}
    />
  );
}

function Row({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex items-center gap-4">
      <h2 className={`${HEADING} w-32 shrink-0`}>{title}</h2>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

/** The home button with and without its dot, and the profile button in each standing. */
function Buttons() {
  const other = PLAYERS[0];
  return (
    <Stage>
      <PreviewTopBar />
      <StageRows>
        <h1 className="font-display text-xl font-black tracking-widest text-gold-400 uppercase">Friends preview</h1>
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
          <Row title="Home">
            <FriendsButton waiting={0} />
            <FriendsButton waiting={2} />
          </Row>
          <Row title="Lobby">
            <InviteFriends
              friends={fakeView(false).friends.map((f, i) => ({
                ...f,
                // One just sent (Invited), one past its minute (Resend), one declined.
                invite: i === 1 ? { status: "PENDING", sentAt: Number.MAX_SAFE_INTEGER } : i === 2 ? { status: "PENDING", sentAt: 0 } : i === 3 ? { status: "DECLINED", sentAt: 0 } : null,
              }))}
              full={false}
              onInvite={pretend()}
            />
            <InviteFriends friends={[]} full={false} onInvite={pretend()} />
            <InviteFriends friends={[]} full onInvite={pretend()} />
          </Row>
          <Row title="Toasts">
            <button type="button" className={BUTTON} onClick={() => showInviteToast(INVITES[0], () => toast("View room opens the room."), () => toast("Decline declines the invite."))}>
              Invite
            </button>
            <button type="button" className={BUTTON} onClick={() => showRequestToast("preview", PLAYERS[5], () => toast("View opens Friends."), () => toast("Decline declines the request."))}>
              Friend request
            </button>
          </Row>
          <Row title="Profile">
            {STANDINGS.map((standing) => (
              <FriendButton
                key={standing}
                standing={standing}
                requestId={standing === "sent" || standing === "received" ? `req-${standing}` : null}
                userId={other.id}
                username={other.username}
                onSend={pretend("Request sent.")}
                onRespond={pretend("You're now friends.")}
                onCancel={pretend()}
                onRemove={pretend()}
              />
            ))}
          </Row>
        </div>
      </StageRows>
    </Stage>
  );
}

/** A friend's invite over a made-up room: the room as it is, and the question that can't be closed. */
function InviteView() {
  const [answered, setAnswered] = useState<boolean | null>(null);
  const invite = INVITES[0];
  return (
    <>
      <PreviewTopBar />
      <LobbyScreen
        joinCode="ABC234"
        hostAwayUntil={null}
        seats={[
          { seat: 0, name: invite.from.username, avatarUrl: invite.from.avatarUrl, isBot: false, isHost: true, isYou: false },
          { seat: 1, name: "Bot 1", isBot: true, isHost: false, isYou: false, difficulty: "normal" },
          null,
          null,
        ]}
        isHost={false}
        targetPoints={16}
        turnTimeSeconds={60}
        gameTimeMinutes={null}
        onAddBot={nothing}
        onRemoveBot={() => nothing}
        onSetBotDifficulty={() => nothing}
        onStart={nothing}
        onLeave={nothing}
      />
      {answered === null ? (
        <InviteDialog
          key="open"
          gameId={invite.gameId}
          from={invite.from}
          line={invite.line}
          onRespond={pretend()}
          onDone={(accept) => {
            toast(accept ? "Join seats you in the room." : "Decline goes home.");
            setAnswered(accept);
            setTimeout(() => setAnswered(null), 1500);
          }}
        />
      ) : null}
    </>
  );
}

/** Every friends screen with made-up players: the Friends screen on a fake store, or the buttons. Nothing is read or saved. */
export function FriendsPreview({ tab, empty, show, here }: { tab?: string; empty: boolean; show?: string; here: string }) {
  const opened: Tab = TAB_NAMES.find((name) => name === tab) ?? "friends";
  // Made once, so the screen's `load` stays the same function between renders.
  const [store] = useState(() => fakeStore(fakeView(empty)));

  return (
    <>
      {show === "buttons" ? (
        <Buttons />
      ) : show === "invite" ? (
        <InviteView />
      ) : (
        <>
          <PreviewTopBar />
          <FriendsScreen userId={null} initial={fakeView(empty)} initialTab={opened}actions={store.actions} load={store.load} />
        </>
      )}
      <PreviewMenu>
        <MenuSection title="Friends">
          {VIEWS.map((view) => (
            <Link key={view.href} href={view.href} className={cn(MENU_PILL, view.href === here ? MENU_LIT : MENU_PLAIN)}>
              {view.name}
            </Link>
          ))}
        </MenuSection>
      </PreviewMenu>
    </>
  );
}
