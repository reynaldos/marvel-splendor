"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "cn";

import { FriendButton } from "@/components/friends/FriendButton";
import { FriendsButton } from "@/components/friends/FriendsButton";
import { FriendsScreen, TAB_NAMES, type Tab } from "@/components/friends/FriendsScreen";
import { Stage, StageRows } from "@/components/Stage";
import { TopBarView } from "@/components/TopBarView";
import type { FriendStanding } from "@/lib/friend-rules";
import { FRAME_TIER_NAMES } from "@/lib/frame-tier";
import type { FriendResult } from "@/lib/friends";

import { MENU_LIT, MENU_PILL, MENU_PLAIN, MenuSection, PreviewMenu } from "../PreviewBar";
import { fakeStore, fakeView, PLAYERS, SELF } from "./fake";

const HEADING = "font-display text-sm font-black tracking-widest text-gold-400 uppercase";
const STANDINGS: Array<Exclude<FriendStanding, "hidden">> = ["none", "sent", "received", "friends"];

/** The menu's ways round the page, each an address so it can be shared. */
const VIEWS = [
  { name: "Friends tab", href: "/preview/friends" },
  { name: "Requests tab", href: "/preview/friends?tab=requests" },
  { name: "Blocked tab", href: "/preview/friends?tab=blocked" },
  { name: "Empty", href: "/preview/friends?state=empty" },
  { name: "Buttons", href: "/preview/friends?show=buttons" },
];

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

/** Every friends screen with made-up players: the Friends screen on a fake store, or the buttons. Nothing is read or saved. */
export function FriendsPreview({ tab, empty, buttons, here }: { tab?: string; empty: boolean; buttons: boolean; here: string }) {
  const opened: Tab = TAB_NAMES.find((name) => name === tab) ?? "friends";
  // Made once, so the screen's `load` stays the same function between renders.
  const [store] = useState(() => fakeStore(fakeView(empty)));

  return (
    <>
      {buttons ? (
        <Buttons />
      ) : (
        <>
          <PreviewTopBar />
          <FriendsScreen initial={fakeView(empty)} initialTab={opened}actions={store.actions} load={store.load} />
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
