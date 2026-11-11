# Roadmap

What is still to build, and how the project got here. Releases are numbered in `data/updates.json`; the release process is in the [README](../README.md#releasing). Each version of the game is a MAJOR number: 1.0.0 was the playable game once the box-art look was on (the original plan below), 2.0.0 brought rank, levels and coins, 3.0.0 opened with Duel and the foil frames, and the versions below are what comes next.

## Version 2

Still open from version 2; each carries on alongside version 3.

- **Sound effects and background music.** Started: music on the board and its preview, four sounds, and Music and Sounds switches that are remembered on the device. Still to do: sounds for the rest of a game's moments (your turn, the timer running low, winning or losing), music on the menus, and more tracks for the shop.
- **A shop, paid for in coins.** Started: the shop screen, buying through the ledger with a `Purchase` table of what each player owns, and the first shelf, card packs, with the Fantastic Four pack and its opening ([UI.md](UI.md), [PROGRESSION.md](PROGRESSION.md)). Since then: the Locations shelf, with a pack of five tiles dealt in like a card pack. Still to do: the other shelves, board backgrounds, background music tracks and maybe layout themes, each of which needs its items listed in `lib/shop.ts` and a way to choose what is in use, which is a schema change; and more packs as the backlog's art lands.

## Version 3, now

The version we are in. It opened with the two-player game and the foil frames.

- **Duel, Splendor for two.** Started: the engine, the bot, the board, a third home tile and a two-seat room, and the how-to slides ([DUEL.md](DUEL.md)). It counts for rank, XP and card levels like the Marvel game. Still to do: art for the powers, the Locations and the bag.
- **Style the game menu.** The menu on the board, and its move log, game settings and forfeit popups, have the theme's colours but plain lists and default buttons. Bring them in line with the menus: the gold headings, pill buttons and icon-and-value settings used on the setup pages.
- Bot banter.
- End-to-end tests.
- **Friends.** Add friends by username, see who is online, and invite them to a room. Planned in full under [Friends, the plan](#friends-the-plan) below. Needs new tables, which is a schema change.
- **Duos, 2 v 2.** A four-seat game played as two teams, partners sitting opposite so turns alternate between teams. The team's points are added together for the end trigger and the standings, and both partners win or lose together. To decide: whether partners share tokens, bonuses or a reserve, or only their score; whether a team may talk beyond the set messages; how rank is scored for a team result; and whether bots can partner a player. Needs a team on each seat, which is a game setting and a change to how the engine ends a game, not a schema change.
- **Tier frames in a shader.** Shipped: one fragment shader, no three.js, draws the frames as live foil with facets, metal and holographic shine, lit from the finger or from how the phone is held, on the collection, the leaderboard, the profile and every avatar ([SHADER_FRAMES.md](SHADER_FRAMES.md)). Still to do: real refraction on the cards drawn large.

## Friends, the plan

Written 2026-11-05 on branch `feature/ops-1105-friends`; extended 2026-11-11 with the preview page, room invites by invite view, the live channel and push notifications. Lines marked **(assumption)** were decided for this plan and were not asked for; any of them can be overturned. The Commander's decisions of 2026-11-11 are listed under [Decisions, 2026-11-11](#decisions-2026-11-11).

**Status, 2026-11-11.** Phase 1 (criteria 1 to 17) is built on this branch: the schema and `prisma/sql/2026-11-05-friends.sql`, the rules in `lib/friend-rules.ts`, the data layer in `lib/friends.ts`, the actions in `app/friends/actions.ts`, the Friends screen, the home button and the button on a profile, with unit tests in `tests/friend-rules.test.ts`, `tests/friends.test.ts` and `tests/friends-lock-adapter.test.ts`. The SQL has not been applied to any database; that is the Commander's call. Phase 2 (criteria 18 to 21) is built: `/preview/friends` in `app/preview/friends/`, with `initialTab` and `load` props on `FriendsScreen`. Phase 3 (criteria 22 to 37) is built: `GameInvite` in the schema and `prisma/sql/2026-11-11-invites.sql` (not applied to any database), `lib/invite-rules.ts`, `lib/invites.ts`, the lobby's Invite friends, the invite view on `/lobby/<id>?invite=<id>`, invite rows on the Requests tab and `FriendNotices` in the top bar. Phase 4 (criteria 38 to 41) is built: `private-user-<id>`, `POST /api/pusher/auth`, `notifyUser` and `useFriendUpdates`. The 3.3.0 update-log entry is written. Phase 5 is planned below and not started. All phases ship together, in two commits: Phases 2, 3 and 4 with the update-log entry in one, Phase 5 in the next.

**What it is for.** A signed-in player can keep a list of the people they play with, see which of them are online, and pull one into their room with a tap instead of sending a room code by text. It works when a player invites a friend from the lobby, the friend gets told on their phone, opens the room, sees who is at the table, and takes a seat with one tap.

### Decided

These were open in the old roadmap line.

- **A friendship needs accepting.** A request waits until the other player accepts it. **(assumption)**
- **Profiles stay open to everyone**, as they are today. Friends see nothing more than anyone else. **(assumption)**
- **Friends are found by username**, the name already unique and shown on the leaderboard and profiles. No separate friend code. **(assumption)**
- **Only signed-in players have friends.** Every seat in a room is already a signed-in player (`lib/lobby.ts`).
- **An invite never seats anyone by itself.** The invited player sees the room first and is seated only when they tap Join on it. Decided 2026-11-11.
- **Push notifications are in the plan**, as Phase 5. The old "later" line that kept them out is gone.
- See [Decisions, 2026-11-11](#decisions-2026-11-11) for the invite view, push and release choices.

### Phases

All phases land on `feature/ops-1105-friends`. Each phase is built and tested alone; a phase never needs the one after it, except that Phase 5's "toast when open, push when closed" rule uses Phase 4's channel. All phases ship together in one release, in two commits: Phases 2, 3 and 4 with the update-log entry, then Phase 5 (see [Docs and release](#docs-and-release)).

**Phase 1: friends. Built.** The Friends button, the Friends screen, requests (send, accept, decline, cancel), the friends list with online status, remove, block and unblock, and the friend button on a profile. Counts reach the player on page load and by a slow poll; no live channel yet. Criteria 1 to 17.

**Phase 2: the preview page. Built.** `/preview/friends`: every friend screen and state with made-up data, no sign-in, nothing read or saved. Criteria 18 to 21.

- *Result.* A preview page in the preview menu beside Popups. It shows the home Friends button with and without its dot, the profile button in each of its four states, and the Friends screen with its three tabs, each with data and empty. Phases 3 and 5 add their own rows to it (the lobby invite dialog, the invite view's dialog, the invite toast, the push prompt), so the page is the place to look at every friend screen without two accounts.
- *Files to add.* `app/preview/friends/page.tsx` (`pageMetadata("Friends preview", undefined, true)` like the other previews), `app/preview/friends/FriendsPreview.tsx` (a client component with the fake data and the rows), and `app/preview/friends/fake.ts` for the fake players, friends, requests and, later, invites.
- *Files to change.* `app/preview/PreviewBar.tsx`: `{ name: "Friends", href: "/preview/friends" }` in `PAGES`, and a Friends part in `AddressHelp` for `?tab=` and `?state=`. The admin page already links to `/preview/board`, which opens the menu that lists every preview page, so nothing changes under `app/admin`. `components/friends/FriendsScreen.tsx` gains one optional prop, `load?: () => Promise<FriendsView>`, used instead of the `GET /api/friends` fetch, so the preview can hand it a fake store whose actions change the fake lists; without the prop it works as today. **(assumption)**
- *How the fake works.* The fake store is a `useState` of a `FriendsView`; its actions edit it and return `{ ok: true }` or a known error, so Accept moves a row to Friends and the "That's you." and "Friends list is full." toasts can be seen. `?tab=requests` opens that tab; `?state=empty` shows the empty lines. A `MenuSection` in the preview menu switches between the two states.
- *Schema.* None.
- *Tests.* None beyond `pnpm exec tsc --noEmit` and `pnpm lint`; the page is looked at by eye. The existing friends tests must still pass after the `load` prop.
- *Release.* No update-log entry; the README keeps previews out of the log.

**Phase 3: room invites. Built.** Invite a friend from the lobby, the invite list on the Friends screen, the invite view with its Join dialog, the toast on the menus, and the dot for invites. On the 30-second poll, no live channel yet. Criteria 22 to 37.

- *Result.* Anyone seated in a room taps Invite friends beside the room code and picks a friend. The friend's home button lights, their Requests tab lists the room, and on a menu screen a toast tells them within 35 seconds. View room, on the toast or the tab, opens `/lobby/<gameId>?invite=<id>`: the room's whole lobby as it is set up, read-only, with a dialog over it that cannot be closed and has only Decline and Join. Join closes the dialog and seats them, and the lobby turns live; Decline marks the invite declined and goes home. If the room has started, filled or closed, the page says so instead.
- *Files to add.* `lib/invite-rules.ts` (pure: whether an invite is still open, the reason when it is not, the limits), `lib/invites.ts` (the data layer: `sendInvite`, `respondInvite`, `invitableFriends`, `inviteFor`; `openInvitesFor` lives in `lib/friends.ts` beside `loadFriends`), `components/friends/InviteDialog.tsx` (the Join or Decline dialog), `components/lobby/InviteFriends.tsx` (the button and its dialog), `components/friends/FriendNotices.tsx` (the client component that polls and toasts on the menus), `tests/invite-rules.test.ts`, `tests/invites.test.ts`, and `prisma/sql/<date>-invites.sql`.
- *Files to change.* `prisma/schema.prisma` (the `GameInvite` model and enum, back-relations on `User` and `Game`); `lib/friends.ts` (`FriendsView` gains `invites`; `waitingRequestCount` counts open invites too); `app/api/friends/route.ts` (unchanged shape plus `invites`); `components/friends/FriendsScreen.tsx` (invite rows above the requests, with View room and Decline); `components/friends/FriendsButton.tsx` (the dot's label says requests or invites); `components/lobby/LobbyScreen.tsx` (a `besideCode` slot for the Invite friends button beside `ShareCode`; the invite view renders it as a guest, its buttons out of reach under the dialog, so it needs no `readOnly` prop); `app/lobby/[gameId]/page.tsx` (reads `?invite=<id>`: for the invited player, not seated, renders the read-only lobby with `InviteDialog` in place of sending them to `/join/<code>`) and `app/lobby/[gameId]/actions.ts` (`inviteFriendAction`, `respondInviteAction`, the friends list for the dialog); `components/TopBar.tsx` (renders `FriendNotices` for a signed-in player); `app/preview/friends/*` (rows for the lobby invite dialog, the invite dialog over a fake lobby, and the toast); `lib/friends.ts` block rule (a block marks the pair's open invites declined, as planned).
- *Schema.* `GameInviteStatus` enum and the `GameInvite` table in the [data model](#data-model). SQL goes in `prisma/sql/<date>-invites.sql` and is not applied to any database without the Commander's approval.
- *Tests.* `tests/invite-rules.test.ts`: open or not for each game status, a full table, a host gone past `HOST_GRACE_MS`, a declined or accepted row, and the per-room limit. `tests/invites.test.ts`, against the fake db of `tests/friends.test.ts`: only a seated player may invite, only to a friend, not to someone seated, a repeat invite makes no row, the 11th is refused, Join calls `joinLobby` and marks accepted only on success, Decline marks declined, a block declines open invites, `loadFriends` leaves out invites whose room is gone, and every action returns "Not found" for someone else's invite.
- *Release.* In the one Friends release, 3.3.0, with Phases 2 and 4 in the same commit.

**Phase 4: the live channel. Built.** A private Pusher channel per player, so requests and invites show within seconds while the app is open. Criteria 38 to 41.

- *Result.* The toast, the Requests tab, the home dot and the Friends tab's online dots change within about 5 seconds of the other player's action, without a reload. Without Pusher keys everything still works on the poll.
- *Files to add.* `lib/user-channel.ts` (the channel and event names), `app/api/pusher/auth/route.ts` (channel auth), `components/friends/use-friend-updates.ts` (the client hook).
- *Files to change.* `lib/pusher.ts` (`notifyUser(userId)` and `authorizeUserChannel(socketId, channel, userId)`), `lib/friends.ts` and `lib/invites.ts` (call `notifyUser` after each write that changes someone's lists), `components/friends/FriendNotices.tsx` and `components/friends/FriendsScreen.tsx` (use the hook in place of their own polls), `.env.example` (nothing new; the Pusher keys already there).
- *Schema.* None.
- *Tests.* `tests/pusher-auth.test.ts`: the auth route signs `private-user-<own id>` and returns 403 for any other channel name and 401 without a session, with Pusher mocked. The friends and invites tests check `notifyUser` is called for the right player after each write (a mock).
- *Release.* In 3.3.0, same commit as Phases 2 and 3. From here the toast covers friend requests too, not only invites.

**Phase 5: push notifications.** A friend request or a room invite reaches the player's phone with the app closed. Criteria 42 to 52.

- *Result.* A Notifications switch on Profile settings, on by default for every account. A device starts getting pushes once the player allows them, from the prompt or the switch. With the app closed, a friend request shows "<username> wants to be your friend" and a tap opens `/friends`; a room invite shows "<username> invited you to a game" and a tap opens `/lobby/<gameId>?invite=<id>`, the room with its Join dialog. With the app open, the player gets the Phase 4 toast and no push. On an iPhone it works once the game is on the Home Screen, which the existing prompt already asks for.
- *Library.* Nothing installed sends Web Push: `pusher` is a different service, and the Next guide (`node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`) uses `web-push`. Add `web-push` and `@types/web-push`. The VAPID keys come from `pnpm exec web-push generate-vapid-keys` and go in `.env` as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` (a `mailto:`). Without them push is off and nothing else changes.
- *Files to add.* `public/sw.js` (the service worker: `push` shows the notification with the game's icon and the target address in `data.url`; `notificationclick` focuses an open window of the game and navigates it, else opens one), `lib/push.ts` (`pushToUser(userId, { title, body, url, tag })`: sends to every subscription of that player, deletes a subscription on a 404 or 410, never throws), `components/PushPrompt.tsx` (the opt-in dialog), `components/PushToggle.tsx` (the settings switch), `app/push/actions.ts` (`savePushSubscriptionAction`, `removePushSubscriptionAction`, zod-checked), `tests/push.test.ts`, `prisma/sql/<date>-push.sql`.
- *Files to change.* `prisma/schema.prisma` (`PushSubscription`, and `pushEnabled Boolean @default(true)` on `User`); `app/settings/actions.ts` (`setPushEnabledAction`); `next.config.ts` (`headers()` for `/sw.js`: no-cache and the service-worker CSP from the guide); `lib/friends.ts` and `lib/invites.ts` (`after(() => pushToUser(...))` from `next/server`, as `lib/record-visit.ts` already does, so the action does not wait for the push); `app/settings/page.tsx` (the switch under the sound switches); `components/friends/FriendsScreen.tsx` (opens the prompt once); `app/preview/friends/*` (a row for the prompt); `.env.example`; `README.md` (the keys, and `next dev --experimental-https` for testing push locally).
- *Schema.* The `PushSubscription` table and the `User.pushEnabled` column in the [data model](#data-model). SQL goes in `prisma/sql/<date>-push.sql` and is not applied to any database without the Commander's approval.
- *Tests.* `tests/push.test.ts` with `web-push` mocked: sends to each of the player's subscriptions, deletes the row on 404 and 410 and keeps it on any other error, sends nothing and throws nothing without keys; the save action refuses a subscription without an endpoint or keys and keeps one row per endpoint. The friends and invites tests check the push is asked for after a request and after an invite, and not after accept, remove or block.
- *Release.* Its own commit, after Phases 2 to 4. It adds its lines to the same 3.3.0 entry, since everything ships at once. **(assumption)**

**Later, not in this plan:**
- Searching by part of a name; this plan needs the exact username.
- Showing "In a game" or which game a friend is in; spectating a friend.
- A friends-only leaderboard, friend counts on profiles, friends-only profiles.
- Email about requests or invites.
- Friends for guests.
- Push for anything else (your turn, a game you are in started).
- Offline caching in the service worker; it only handles push.

### Decisions, 2026-11-11

Made by the Commander. They replace the open questions of the first draft.

1. **The invite view is the lobby page**, `/lobby/<gameId>?invite=<id>`. No separate invite route.
2. **The invited player sees the whole lobby as it is set up**: seats, kind, settings and the room code, with every lobby button disabled. The Join dialog sits over it.
3. **The dialog cannot be closed.** No X, no Escape, no tap outside. Only Decline (marks the invite declined, goes home) and Join (closes the dialog and seats them).
4. **Join lives only in that dialog.** The toast and the Requests tab say View room, which opens the lobby with the dialog. The Requests tab row also keeps Decline. **(assumption)**, pending the Commander's confirmation.
5. **Everything ships at once, in two commits:** Phases 2, 3 and 4 with the update-log entry; then Phase 5.
6. **Push on two events only:** a new friend request, to the receiver, and a new invite, to the invited player.
7. **The notifications switch is per account**, a new `User.pushEnabled` column, on by default. Each device still keeps its own `PushSubscription` row, since the browser grants push per device.
8. **The prompt asks once**, the first time the Friends screen opens with a friend or a request, and never asks the browser before a tap on Turn on. **Profile settings gets a Notifications switch**, on by default.
9. **App open: a toast. App closed: a push.** Never both. See [Push notifications](#push-notifications-phase-5).

### Home screen

- The footer today is: Shop, Friends, the middle line, Leaderboard, How to play (`components/home/HomeScreen.tsx`). Built in Phase 1.
- The Friends button is the same round button as Shop and Leaderboard (`size-14`, `bg-cosmos-700`, `ring-cosmos-500`, gold icon), with Lucide `Users`, `aria-label="Friends"`, and links to `/friends`.
- It wears the gold new dot (`NewDot`) while the player has a friend request or, from Phase 3, a room invite waiting. The count comes from the server with the home page (`waitingRequestCount`), not from the device as the Shop's dot does, because it is about the account. Phase 4 refreshes the page on the live signal so the dot changes without a reload.

### The Friends screen, `/friends`

A menu screen like the shop: `<Stage>`, `<StageRows>`, `<TopBar />`. Visitors who are not signed in go to sign in and come back (`/auth/login?returnTo=/friends`). Built in Phase 1 as laid out here.

- **Down the left**, like the shop's shelves: Friends, Requests (with a count while any are waiting), Blocked, and Back.
- **Friends tab.** An Add friend field and button at the top. Below, the friends list: picture (`PlayerAvatar`), username, name if set, and a green Online dot or nothing. Online friends first, then the rest, each part by username A to Z. Tapping a friend shows them on the right with View profile, Remove and Block. The list scrolls inside its own box; the page never scrolls.
- **Requests tab.** Received requests first, each with Accept and Decline. Then sent requests, each with Cancel. From Phase 3, room invites sit above both, each saying who invited and whether it is the Marvel game or a Duel, with View room (a link to `/lobby/<gameId>?invite=<id>`) and Decline.
- **Blocked tab.** Each blocked player with Unblock.
- **Empty states.** No friends: "No friends yet. Add one by their username." No requests: "Nothing waiting." Nobody blocked: "You haven't blocked anyone."
- **Remove and Block ask first**, in the screen's one dialog, the destructive button last.
- **Phase 5** opens the push prompt here, once, as decided under [Decisions, 2026-11-11](#decisions-2026-11-11) 8.

### On a profile

On someone else's profile (`app/profile/[username]`), for a signed-in viewer, one button shows where they stand: Add friend, Request sent (tap to cancel), Accept request, or Friends (tap for Remove). Nothing shows on your own profile, to a visitor not signed in, or between players where either has blocked the other. Built in Phase 1.

### The preview page, `/preview/friends` (Phase 2)

Like `/preview/modals`: `<Stage>`, the real `TopBarView` with made-up numbers, a heading, and rows that scroll on a short screen. Nothing is read or saved; no sign-in.

- **Home** row: `FriendsButton` with `waiting={0}` and with `waiting={2}`.
- **Profile** row: `FriendButton` four times, one per standing, each with fake handlers that return `{ ok: true }` after a short wait and show its toast.
- **Friends screen** row: the real `FriendsScreen` in a box of the stage's height, fed the fake store. `?tab=` opens a tab; `?state=empty` shows the empty lines; the preview menu has the same switches.
- **Phase 3 adds**: the Invite friends dialog with a fake friends list; the invite view's dialog over a fake lobby (`?show=invite`, two fake seats); and a button that fires the invite toast.
- **Phase 5 adds**: the push prompt, and its iPhone-not-installed wording.
- The fake data lives in `app/preview/friends/fake.ts`: six players with library avatars, three of them online, two received requests, one sent, one blocked, one invite to a Marvel room and one to a Duel.

### In the lobby (Phase 3)

- Beside the room code (`components/lobby/ShareCode.tsx`), anyone seated sees an Invite friends button (round, Lucide `UserPlus`, `aria-label="Invite friends"`). The room code is already shown to everyone seated, so anyone seated may invite. **(assumption)**
- It opens a dialog listing friends, online first, each with Invite. After a tap the button reads Invited and is disabled. Friends already seated are left out. With no friends: "Add friends from the home screen." and nothing else.
- With no free seat the button is disabled.
- The friends list for the dialog comes with the lobby page (`loadFriends`, friends only), not by a fetch, so the dialog opens at once. The lobby page already re-renders on every table change through `LobbyLive`, which keeps the "already seated" filter right. **(assumption)**

### The invite view, `/lobby/<gameId>?invite=<id>` (Phase 3)

Where a tap on the toast, the Requests tab row or, in Phase 5, the push lands. It shows the room before the player is seated. Without `?invite=`, the lobby page works as today.

- **Who may open it.** Only the invited player, signed in (`/auth/login?returnTo=/lobby/<gameId>?invite=<id>`). For anyone else, an invite id that does not match the game, or a missing id, the page acts as if there were no `?invite=`: a seated player sees the lobby, anyone else is sent to `/join/<code>` as today. **(assumption)**
- **Already seated** in that room (they joined by code meanwhile): the `?invite=` is ignored and they see their lobby, or go to `/play/<gameId>` if it started with them in it.
- **The invite is open** (`inviteOpen` in `lib/invite-rules.ts`: status `PENDING`, the game `LOBBY`, a free seat, the host not gone past `HOST_GRACE_MS`): the page renders `<TopBar />`, `<LobbyLive gameId isHost={false} hostAwayUntil />` so the seats refresh as they change, `<LobbyScreen isHost={false} />` with the whole lobby as set up (seats, kind, points target, timers, room code), its buttons out of reach under the dialog, and `InviteDialog` open over it: "<username> invited you to a game", a line with the kind and the seats taken ("Marvel game, 2 of 4 seats taken" or "Duel, 1 of 2 seats taken"), then Decline and Join. The viewer's own name is nowhere on the table until they join.
- **The dialog cannot be closed.** No X, Escape and a tap outside do nothing; the only way out is Decline or Join.
- **Join** calls `respondInviteAction(id, true)`: the action checks the session, loads the invite as the invited player, calls `joinLobby(userId, game.joinCode)` and marks the invite `ACCEPTED` only when that seats them, then refreshes `/lobby/<gameId>` without the param: the dialog is gone and the player is in the live lobby. A refusal ("That game is full.", "That game has already started.", "That room has closed.", the open-games message) comes back as a toast; the invite stays `PENDING`, and the page's next refresh shows the notice below if the room is gone.
- **Decline** calls `respondInviteAction(id, false)`: marks it `DECLINED` and goes home.
- **The invite is not open**: a notice in place of the room, with Back to home. "That game has already started." (status `ACTIVE` or `FINISHED`), "That room has closed." (`ABANDONED`, or the host gone too long: the page calls `closeIfHostGone` as the lobby page does), "That game is full.", "You declined this invite." or "You already joined this room." (accepted but no longer seated). The same words `joinLobby` uses, so a player sees one message for one reason.
- **While the page is open** the room may start, fill or close. `LobbyLive` refreshes the page on the game's signal; the next render shows the notice, and a Join tapped in that moment is refused by `joinLobby` with the same words.

### When an invite arrives (Phase 3)

- On any menu screen with the top bar (home, profile, settings, Play Game, Duel, lobby), a toast through the `Toaster` already mounted in `app/layout.tsx`: "<username> invited you to a game", with View room and Not now. View room goes to `/lobby/<gameId>?invite=<id>`; Decline on the toast declines the invite, as on the Requests tab; the toast hides itself after 30 seconds and the invite stays on the Requests tab. The toast does not seat anyone. From the Friends screen, Send invite on a chosen friend picks Original or Duel, sets it up, opens the room, invites them and goes there (`inviteToNewRoomAction`); a player already waiting in a room invites to that one. Decided 2026-11-11. From Phase 4, a new friend request gets a toast too: "<username> wants to be your friend", with View (to `/friends`).
- The toast comes from `FriendNotices`, a client component rendered by `TopBar` for a signed-in player. In Phase 3 it polls `GET /api/friends` every 30 seconds and when the tab comes back; in Phase 4 it also listens on the private channel. It remembers the invite ids it has shown in `sessionStorage`, so a reload does not repeat a toast and a new tab shows it once. A notice that comes while the tab is hidden waits and shows when the tab is visible again. When the waiting count changes it calls `router.refresh()` so the home dot and the Requests count follow. **(assumption)**
- Not on the board. A player in a game sees it on the Friends screen afterwards.
- In Phase 5 the same invite reaches a phone with the app closed as a push, and a tap on it opens `/lobby/<gameId>?invite=<id>`. An open app gets the toast only.

### Live updates (Phase 4)

- A private channel per player, `private-user-<userId>`, named in a new `lib/user-channel.ts` beside `lib/game-channel.ts`.
- One event, `friends-updated`, with **no data**, on the same rule as the game channel: it only says "fetch again", so nothing leaks through it. Sent to the receiver on a new request, a cancelled request or an invite, to the sender when a request is accepted, and to the other player on remove or block. A friend-request decline tells nobody, so it stays hidden. A room-invite decline is shown: it triggers the game's signal, so the room re-renders with Declined on that friend's row and a toast for the seated players; a Join reaches them the same way.
- `lib/pusher.ts` gains `notifyUser(userId)`, which never throws as `notifyGame` doesn't, and `authorizeUserChannel(socketId, channel, userId)`, which wraps `pusher.authorizeChannel`.
- `POST /api/pusher/auth` reads `socket_id` and `channel_name` from the form body `pusher-js` sends, checks the session, and signs only `private-user-<own id>`; anything else gets 403, no session 401. Without Pusher keys it returns 503.
- The client side is one hook, `useFriendUpdates(onUpdate)`, built like `components/game/use-game-updates.ts`: a `pusher-js` client with `channelAuthorization: { endpoint: "/api/pusher/auth", transport: "ajax" }`, the event, `connected`, `visibilitychange` and a 30-second poll as the safety net. `FriendNotices` and `FriendsScreen` both use it. Without `NEXT_PUBLIC_PUSHER_KEY` it is the poll alone. On the lobby page this is a second Pusher connection beside the game's. **(assumption)** `ponytail:` one shared client if connection counts ever matter.

### Push notifications (Phase 5)

Web Push through `web-push` with VAPID keys, as in the Next guide; the guide's in-memory subscription becomes the `PushSubscription` table.

- **Who gets a push.** The receiver of a new friend request ("<username> wants to be your friend", opens `/friends`) and the invited player of a new room invite ("<username> invited you to a game", opens `/lobby/<gameId>?invite=<id>`). Nothing else. Only when `User.pushEnabled` is true.
- **Toast or push, never both.** Before it sends, `pushToUser` asks Pusher whether the player's channel `private-user-<id>` is occupied (`pusher.get({ path: "/channels/private-user-<id>" })`, field `occupied`). Occupied means the app is open somewhere: the Phase 4 event brings the toast, and no push goes out. Not occupied, or Pusher not set up or not answering: the push goes out. **(assumption)** A desktop tab left open in the background counts as open; its toast waits until the tab is visible. Each notification carries a `tag` (`friend-request-<id>`, `invite-<id>`) so a repeat replaces, never stacks. The title is the game's name; the icon is `/icons/icon-192.png`.
- **How it is sent.** The friends and invites data layers call `after(() => pushToUser(...))` right after the write, so the action returns without waiting. `pushToUser` loads the player's subscriptions, sends to each, deletes a subscription that answers 404 or 410 (gone), logs any other failure and never throws. Without VAPID keys it does nothing.
- **The service worker**, `public/sw.js`, registered from `components/PushToggle.tsx` and `components/PushPrompt.tsx` with `navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })`. Two listeners: `push` shows the notification from the payload; `notificationclick` closes it, then focuses a window of the game that is already open and navigates it to `data.url`, or opens a new one. No caching, no offline. `next.config.ts` adds `headers()` for `/sw.js`: `Cache-Control: no-cache, no-store, must-revalidate` and the guide's service-worker CSP.
- **Turning it on.** Only on a tap: `Notification.requestPermission()` then `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`, then `savePushSubscriptionAction(subscription.toJSON())`. One row per endpoint (`@unique`); subscribing again on the same device updates the keys. Permission denied: the switch stays off and a toast says notifications are blocked in the browser's settings.
- **Turning it off.** `subscription.unsubscribe()` then `removePushSubscriptionAction(endpoint)`. Sign out and delete account: the rows go with the user (cascade); a signed-out device keeps its browser subscription until it is next turned off, and a push to it is only sent to the account it belongs to. **(assumption)**
- **The prompt**, `components/PushPrompt.tsx`, built like `components/AddToHomeScreen.tsx`: a dialog, once a visit until ticked off for good (`sessionStorage` and `localStorage` keys), opened from the Friends screen the first time it has a friend or a request. "Get told when a friend invites you?" with Turn on and Not now. On an iPhone still in the browser (`onIphoneBrowser`) it says instead "Add the game to your Home Screen first, then turn notifications on in Profile settings." with the Share-then-Add steps the Home Screen prompt already draws. Where push is not supported (`!("PushManager" in window)`) the prompt never opens.
- **The switch**, `components/PushToggle.tsx`, on Profile settings under Music and Sounds, labelled Notifications. It shows `User.pushEnabled`, on by default for every account, and saves it with `setPushEnabledAction`. Off stops every push to every device of the account. Turning it on, or seeing it on, on a device with no subscription yet shows a "Allow on this device" button that asks the browser and subscribes. Where push is not supported the switch still saves the account setting, with a line that this device can't get notifications; on an iPhone in the browser that line is the Home Screen line.
- **iPhone.** Push needs iOS 16.4 or later and the game on the Home Screen; the manifest (`app/manifest.ts`, `display: "standalone"`) and the Home Screen prompt are already there. Testing locally needs HTTPS: `next dev --experimental-https`, and the phone on the same network trusting the certificate, or a tunnel.
- **Keys.** `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` in `.env.example`, with how to make them; set in Vercel by the Commander.

### Data model

Phase 1's four tables are built. Phase 3 adds `GameInvite` and its enum; Phase 5 adds `PushSubscription`. Nothing is changed or removed. Every relation to `User` deletes with it (`onDelete: Cascade`), so `deleteAccountAction` keeps working without a change. The SQL goes in `prisma/sql/<date>-invites.sql` and `prisma/sql/<date>-push.sql` beside the earlier ones, plus the back-relations on `User` and `Game` in `schema.prisma`. Applying the SQL to any database, including production, is the Commander's call, as with every schema change.

```prisma
enum FriendRequestStatus {
  PENDING
  DECLINED
}

// Phase 3.
enum GameInviteStatus {
  PENDING
  ACCEPTED
  DECLINED
}

// A request one way. Accepting deletes it and makes the friendship; cancelling deletes it.
model FriendRequest {
  id          String              @id @default(cuid())
  fromUserId  String
  from        User                @relation("FriendRequestsSent", fields: [fromUserId], references: [id], onDelete: Cascade)
  toUserId    String
  to          User                @relation("FriendRequestsReceived", fields: [toUserId], references: [id], onDelete: Cascade)
  status      FriendRequestStatus @default(PENDING)
  createdAt   DateTime            @default(now())
  respondedAt DateTime?

  @@unique([fromUserId, toUserId])
  @@index([toUserId, status])
}

// One row per request sent. It stays when the request is cancelled or accepted, so the daily limit still counts it.
model FriendRequestSend {
  id         String   @id @default(cuid())
  fromUserId String
  from       User     @relation("FriendRequestSends", fields: [fromUserId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())

  @@index([fromUserId, createdAt])
}

// Two rows per friendship, one each way, so a player's list is one indexed read.
model Friendship {
  userId    String
  user      User     @relation("Friendships", fields: [userId], references: [id], onDelete: Cascade)
  friendId  String
  friend    User     @relation("FriendOf", fields: [friendId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@id([userId, friendId])
}

model UserBlock {
  blockerId String
  blocker   User     @relation("Blocks", fields: [blockerId], references: [id], onDelete: Cascade)
  blockedId String
  blocked   User     @relation("BlockedBy", fields: [blockedId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@id([blockerId, blockedId])
}

// Phase 3. Open only while its game is still a room (LOBBY) with a free seat; no expiry column, the game's status is the expiry.
model GameInvite {
  id          String           @id @default(cuid())
  gameId      String
  game        Game             @relation(fields: [gameId], references: [id], onDelete: Cascade)
  fromUserId  String
  from        User             @relation("InvitesSent", fields: [fromUserId], references: [id], onDelete: Cascade)
  toUserId    String
  to          User             @relation("InvitesReceived", fields: [toUserId], references: [id], onDelete: Cascade)
  status      GameInviteStatus @default(PENDING)
  createdAt   DateTime         @default(now())
  respondedAt DateTime?

  @@unique([gameId, toUserId])
  @@index([toUserId, status])
}

// Phase 5. One row per browser or installed app that asked for push; deleted when the push service says it is gone.
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation("PushSubscriptions", fields: [userId], references: [id], onDelete: Cascade)
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())

  @@index([userId])
}
```

- `Game` gains `invites GameInvite[]`; `User` gains the back-relations named above (`invitesSent`, `invitesReceived`, `pushSubscriptions`) and, in Phase 5, `pushEnabled Boolean @default(true)`, the account's Notifications switch.
- The two `Friendship` rows are written and deleted together in one transaction, under the pair's advisory lock (`lib/friends.ts`).
- No cron for invites: an invite whose room is no longer open is left out of every list and count, and the daily sweep already closes dead rooms. Rows of old rooms stay; `ponytail:` delete invites older than a week in `sweepDeadGames` if the table ever grows.

### Rules

In `lib/friends.ts` and, from Phase 3, `lib/invites.ts`, with the parts that need no database in pure files (`lib/friend-rules.ts`, `lib/invite-rules.ts`) so they can be tested like `lib/lobby-rules.ts`.

- **Send a request** by username: trimmed and lowercased as `checkUsername` does, matched exactly.
  - Yourself: "That's you."
  - No such player, a player blocked by an admin, or a player who has blocked you: all get the same "No player has that username.", so a block can't be detected.
  - You have blocked them: "Unblock them first."
  - Already friends: "You're already friends."
  - You already sent one that is waiting: "Request already sent."
  - **They already sent you one: it is accepted** and you are friends.
  - They declined yours less than 7 days ago: "Request already sent." (the decline is not shown) **(assumption)**
  - Otherwise a waiting request is made, or a declined one older than 7 days is set back to waiting.
- **Accept**: only the receiver; makes both `Friendship` rows and deletes the request, and any request the other way.
- **Decline**: only the receiver; marks it declined. The sender keeps seeing it as sent until they cancel it. **(assumption)**
- **Cancel**: only the sender; deletes it.
- **Remove**: deletes both friendship rows. The other player is not told. **(assumption)**
- **Block**: makes the `UserBlock` row, deletes the friendship and requests both ways, and from Phase 3 marks the open invites between the pair, both ways, declined. Unblock deletes the row and restores nothing.
- **Online** means `UserVisit.lastSeenAt` within the last 5 minutes. **(assumption)** That column is already written when a signed-in page loads, at most once a minute (`lib/record-visit.ts`); no new tracking.
- **Invite** (Phase 3): only a player seated in that room; only while the room is `LOBBY` with a free seat; only to a friend (checked at send time, so a removed friend can't be invited); not to someone already seated; not to a player blocked by an admin. An unanswered invite can be sent again once a minute has passed (`RESEND_AFTER_MS`), which renews it so the friend is told again; sooner gets "Wait a minute before you send it again." A declined invite to the same room can't be sent again ("They declined this invite."), and its row reads Declined. Decided 2026-11-11. An invite is open only while its room is still in the lobby, not full and not closed by `closeIfHostGone`; otherwise it is left out of every list and count and the invite view shows why.
- **Join** (Phase 3): only the invited player, from the dialog on `/lobby/<gameId>?invite=<id>`; calls `joinLobby(userId, game.joinCode)` and marks the invite accepted only when that succeeds. **Decline**: only the invited player; marks it declined.
- **Push** (Phase 5): sent after a new request and a new invite, to that one player, never to the sender, only with `pushEnabled` on and the player's channel not occupied; a subscription may only be saved or removed by its own signed-in player.

### Limits against abuse

**(assumption)** for each number.

- At most **200 friends**. A request that would pass it, for either player: "Friends list is full."
- At most **20 sent requests waiting** at once.
- At most **30 friend requests sent in a day** (rolling 24 hours, counted from the `FriendRequestSend` log, which cancelling or accepting a request does not touch).
- At most **10 invites from one player to one room** (Phase 3).
- At most **5 push subscriptions per player**; a sixth replaces the oldest (Phase 5).
- Every action checks the session first and returns the same "Not found" whether a row is missing or belongs to someone else.

### Actions and routes

Mutations are server actions, as the shop, settings and private rooms do it; reads for the poll and the live channel are route handlers. Inputs are checked with zod as in `lib/api-schemas.ts`.

| Where | Phase | What |
|---|---|---|
| `app/friends/page.tsx` | 1 | The Friends screen |
| `app/friends/actions.ts` | 1 | `sendFriendRequestAction(username)`, `respondFriendRequestAction(id, accept)`, `cancelFriendRequestAction(id)`, `removeFriendAction(userId)`, `blockPlayerAction(userId)`, `unblockPlayerAction(userId)` |
| `GET /api/friends` | 1, 3 | The signed-in player's friends with online state, requests both ways, blocks, open invites (Phase 3) and the waiting count, for the polls and the live refetch |
| `app/preview/friends/page.tsx` | 2 | The preview page, no sign-in |
| `app/lobby/[gameId]/page.tsx` | 3 | With `?invite=<id>`: the room read-only with the Join dialog, or the notice |
| `app/lobby/[gameId]/actions.ts` | 3 | `inviteFriendAction(gameId, friendId)`; `respondInviteAction(id, accept)`: Join seats through `joinLobby` and refreshes the lobby; Decline marks it and redirects home |
| `app/friends/actions.ts` | 3 | `declineInviteAction(id)`, for the Requests tab row |
| `POST /api/pusher/auth` | 4 | Pusher channel auth. Signs only `private-user-<own id>` for the signed-in player; anything else gets 403 |
| `app/push/actions.ts` | 5 | `savePushSubscriptionAction(subscription)`, `removePushSubscriptionAction(endpoint)` |
| `app/settings/actions.ts` | 5 | `setPushEnabledAction(on)`, the account's Notifications switch |
| `public/sw.js` | 5 | The service worker, served as a static file with no-cache headers from `next.config.ts` |

### Edge cases

| Case | What happens |
|---|---|
| No friends, no requests, nobody blocked | The empty-state lines above |
| Friend renames themselves | Shown by their new username; rows hold the user id |
| Friend deletes their account | Their rows go with the account; they drop off the list, and their invites and push subscriptions go too |
| Friend is blocked by an admin | They stay on the list, never shown online; they can't be invited |
| Both send each other a request at once | One becomes a friendship; the pair lock and the accept-on-cross rule keep it to one pair of rows |
| Accept tapped twice | The second does nothing |
| Invite to a room that then fills, starts or closes | The invite disappears from the lists and the dot; the invite view shows the reason; Join from a stale dialog shows `joinLobby`'s reason ("That game is full.", "That game has already started.", "That room has closed.") |
| Invited player already has two games open | Join shows the open-games message; the invite stays waiting |
| Invited player joined by code meanwhile | Not offered in the invite list; `?invite=` is ignored and they see their lobby |
| Invited player removed or blocked the inviter after the invite | A block declines it; a remove leaves it, and the room shows who invited |
| Two invites to the same player from two rooms | Two toasts, two rows, two pages; each stands alone |
| Duel room, two seats | Same rules; full after one guest |
| Offline or the action fails | A toast says it didn't go through; nothing changes on screen |
| Pusher not set up | Everything works on the 30-second poll |
| VAPID keys not set | No prompt, no switch, no push; everything else unchanged |
| Push permission denied in the browser | The switch stays off with a toast; the prompt is not shown again |
| Subscription expired on the push service (404 or 410) | The row is deleted on the next send; the switch reads off on that device next time |
| Push tapped for an invite that is no longer open | The lobby page shows the reason |
| App open in a background tab when an invite comes | No push; the toast shows when the tab is visible again |
| Notifications switch off | No push to any device; toasts still show while the app is open |
| Push tapped while the game is open in a tab | That tab is focused and navigated; no second window |
| 200 friends | The list scrolls in its box |
| Cheat codes | Not carried by invites |

### Docs and release

- [ARCHITECTURE.md](../ARCHITECTURE.md): the data model gains `GameInvite` (Phase 3) and `PushSubscription` (Phase 5), the routes table the new ones, and the realtime section the private user channel (Phase 4) and push (Phase 5). Section 5 was fixed in Phase 1 to match the code.
- [UI.md](UI.md): the Friends section is written for Phase 1. Phase 3 adds the lobby's Invite friends, the invite view and the toast; Phase 5 adds the prompt and the settings switch. The previews section names `/preview/friends` (Phase 2).
- `README.md`: Phase 5 adds the VAPID keys and the HTTPS note for testing push.
- `data/updates.json` and `package.json`: everything ships at once, so one MINOR release, **3.3.0, "Friends"**, in the file's shape (`version`, `date`, `title`, `summary`, `pulls`, `new`, `improved`, `fixed`), latest first, in player words. Previews and tests are left out. 3.2.1 was the last release in `package.json`; 3.2.2 is in the log, so the release is 3.3.0 and `package.json` goes to it. Dated the day it ships.
  - **First commit** (Phases 2 to 4) writes the entry: new: "A Friends button on the home screen: add friends by their username, and see which of them are online"; "Friend requests wait on the Requests tab, with a gold dot on the Friends button while one is waiting"; "Add, accept or remove a friend from their profile page"; "Block a player to keep them from sending you requests"; "Invite friends to your room from the lobby, no code needed"; "An invite shows you the room first, then Join or Decline". Improved: "Friend requests and invites show up within seconds while the game is open".
  - **Second commit** (Phase 5) adds to the same entry: new: "Notifications: a friend request or a room invite reaches your phone with the game closed, and a tap opens it. The switch is in Profile settings; on an iPhone, add the game to your Home Screen first".
- When all of it ships, this section shrinks to a line under Done.

### Acceptance criteria

Numbered for the build and the test. Two signed-in test accounts, A and B, on a database with the new tables. Criteria 1 to 17 are built; criteria 18 onward were renumbered on 2026-11-11, when nothing past 17 was built. **Phase 1:**

1. Given A is signed in on the home screen, the footer shows Shop, then Friends, then the middle line, then Leaderboard and How to play; Friends is the same size and style as Shop, and the middle line is still centred.
2. Given a visitor who is not signed in, the welcome screen shows no Friends button, and opening `/friends` sends them to sign in and back to `/friends`.
3. Given A has no friends, requests or blocks, each tab shows its empty-state line.
4. When A types B's username in any case with spaces around it and taps Add, then B's Requests tab shows A's request, and A's shows it under sent.
5. Given B has a request waiting, B's home Friends button shows the gold dot; after B accepts or declines it and returns home, the dot is gone.
6. When B accepts, then A and B each see the other on their Friends tab, and the database holds exactly two `Friendship` rows for the pair.
7. When A sends to B while B's request to A is waiting, then they become friends and no request rows remain between them.
8. When B declines, then A still sees the request as sent; a new request from A within 7 days shows "Request already sent." and makes no new row.
9. When A cancels a sent request, then it disappears for both.
10. A request to A's own username shows "That's you."; to an unknown username shows "No player has that username."
11. Given B is online (a page loaded in the last 5 minutes), A sees B with the Online dot, listed before offline friends; 5 minutes after B's last page load, the dot is gone after A's next poll or reload.
12. When A removes B after the confirm, then neither sees the other on the Friends tab.
13. When A blocks B, then the friendship and any requests between them are gone, B is on A's Blocked tab, and a request from B to A shows "No player has that username." When A unblocks B, B can send a request again.
14. On B's profile, A sees the right single button for each state: Add friend, Request sent, Accept request, Friends; A sees none on A's own profile.
15. The 21st waiting sent request, the 31st request in 24 hours and a request past 200 friends are each refused with their message and make no row.
16. Given A has friends and requests, when A deletes the account, then the delete succeeds and B's lists no longer show A.
17. Sending a friend action for a request or player that isn't A's (by editing the request) returns "Not found" and changes nothing.

**Phase 2, the preview:**

18. `/preview/friends` opens without signing in, is listed as Friends in the preview menu, and makes no request to `/api/friends` and no database read.
19. The page shows the Friends screen, and `?show=buttons` the home button with and without its dot and the profile button in all four states; tapping Accept on a fake request moves that player to the Friends tab, and the "That's you." toast can be made to show.
20. `?tab=requests` opens the Requests tab; `?state=empty` shows the three empty-state lines; the preview menu's switches do the same.
21. `pnpm exec tsc --noEmit`, `pnpm lint` and the existing friends tests pass with the `load` prop added to `FriendsScreen`.

**Phase 3, invites:**

22. Given A is seated in a room with a free seat, the Invite friends button is beside the room code; its dialog lists A's friends, online first, and leaves out friends already seated. With no free seat the button is disabled.
23. When A taps Invite on B, the button reads Invited; tapping again makes no second invite row. The 11th invite from A to the same room is refused with a message.
24. Given B is on a menu screen with the top bar, within 35 seconds of A's invite a toast shows "<A's username> invited you to a game" with View room and Not now; B's home Friends button shows the dot, and B's Requests tab lists the room above the requests with View room and Decline.
25. When B taps View room, then `/lobby/<gameId>?invite=<id>` shows A's whole lobby as set up, room code included, with every lobby button disabled, and the dialog "<A's username> invited you to a game" with Decline and Join; B is not seated and A's lobby does not show B.
26. When B taps Join, then the dialog closes, B is seated in A's lobby, A's lobby shows B without a reload, the invite is `ACCEPTED`, and it is gone from B's Requests tab and dot.
27. When B taps Decline, in the dialog or on the tab, then B goes home, the invite is `DECLINED`, it is gone from B's lists, and A's dialog cannot invite B to that room again.
28. The dialog has no X; Escape and a tap outside it do nothing. Decline and Join are the only ways out.
29. Given the room filled, started or closed before B opens the link, then the lobby page shows the matching notice with Back to home and no Join, and the invite is gone from B's lists and dot.
30. Given the room fills or starts while B's page is open, then within 15 seconds the page shows the notice; a Join tapped before that shows `joinLobby`'s reason and does not seat B.
31. Given B already has two games open, Join shows the open-games message and the invite stays on B's Requests tab.
32. Given B joined A's room by code before opening the link, then `?invite=` is ignored and B sees the lobby, seated, with no dialog.
33. Opening `/lobby/<gameId>?invite=<id>` as a third account, or with a made-up id, sends them to `/join/<code>` as without the param; signed out, it goes to sign in. It never shows the dialog to anyone but B.
34. B on the board gets no toast; the invite is on B's Requests tab afterwards.
35. When A blocks B while an invite to B is open, then the invite is `DECLINED` and gone from B's lists.
36. A reload of B's menu screen does not repeat the toast for an invite already shown; a new invite shows a new toast.
37. The preview page shows the lobby invite dialog, the invite dialog over a fake lobby, and fires the toast, without sign-in.

**Phase 4, live:**

38. Given Pusher is configured and B is on a menu screen or the Friends screen, within 5 seconds of A's request, invite, accept, remove or block, B's toast, lists, counts and dot change without a reload.
39. A subscription to `private-user-<someone else's id>` is refused by `POST /api/pusher/auth` with 403; without a session, 401.
40. With the Pusher keys removed, every Phase 3 criterion still passes on the poll.
41. The `friends-updated` event carries no data (checked in the Pusher debug console or a test on `notifyUser`). Given B has the app open, a new friend request from A shows the toast "<A's username> wants to be your friend" with View.

**Phase 5, push:**

42. Given the VAPID keys are set and B is on Chrome or Safari with the game installed, when B taps Turn on in the prompt or Allow on this device in settings, the browser asks for permission, and after Allow one `PushSubscription` row exists for B with that endpoint. A new account's Notifications switch reads on; turning it off sets `User.pushEnabled` to false and no device of B's gets a push until it is on again.
43. Given B's app is closed, when A sends B a friend request, B's phone shows "<A's username> wants to be your friend" within a minute; a tap opens the game on `/friends`.
44. Given B's app is closed, when A invites B, B's phone shows "<A's username> invited you to a game"; a tap opens `/lobby/<gameId>?invite=<id>` with the room and the Join dialog, and B is not seated until Join.
45. Given B has the app open, when A sends B a request or an invite, B gets the toast and no push.
46. Given the room started before B taps the notification, the lobby page shows "That game has already started."
47. Two pushes for the same request or invite replace each other on the phone (same `tag`); accept, decline, remove, block and cancel send no push.
48. Given B's subscription is gone on the push service (a 410 from a mocked `web-push`, or the browser subscription removed), the next send deletes B's row and the send to B's other devices still goes out.
49. On an iPhone in Safari, not installed, the prompt and the settings line say to add the game to the Home Screen first; once installed and opened from the Home Screen, criterion 42 passes.
50. With the VAPID keys removed, no prompt opens, the settings switch is not shown, and nothing else changes.
51. A subscription saved by editing the request for another user id lands on the signed-in player only; `removePushSubscriptionAction` for an endpoint that is not the signed-in player's returns "Not found" and deletes nothing.
52. The prompt opens once a visit and never again after "Don't show this again"; it never calls `Notification.requestPermission()` before a tap on Turn on.

### Checks for a PASS

- `pnpm exec vitest run`, all passing, including the new tests named under each phase: `tests/invite-rules.test.ts`, `tests/invites.test.ts`, `tests/pusher-auth.test.ts`, `tests/push.test.ts`, in the style of `tests/friends.test.ts` (a fake db, mocks for `web-push` and `pusher`).
- `pnpm exec tsc --noEmit`, no errors.
- `pnpm lint`, no errors.
- `pnpm build`, succeeds.
- The acceptance criteria of the phase walked by hand with two accounts in two browsers, at a phone-sized landscape viewport, on a database that is not production; for Phase 5, also on a real iPhone with the game installed, over HTTPS.
- The home footer, the Friends screen, the invite view and the preview compared with DESIGN.md: round buttons, the one-dialog rule, focus rings, `aria-label`s, no page scroll.

## Version 4

- **Ranked matchmaking (Quick Play).** A public queue that pairs players by rank for a multiplayer game, instead of needing a room code. Depends on rank existing. To decide: how wide a rating gap to accept and whether it widens the longer someone waits, whether it's 2-player only or fills a 3–4 table, and how the queue itself is run (likely the same Pusher presence pattern as the lobby).
- **Team against team at the end of a game.** A comparison of the teams each player recruited: heroes against villains, points, bonuses by stone, Avengers badges, and the strongest card on each side. It can be worked out from the saved game, as the stats are.
- **A "squad pic" at the end of a game.** A picture of the player's recruited team to keep or share. To decide first: put together from the card art the game already has, or drawn by an image model. The second costs money per picture and needs care over the use of Marvel's characters.
- **A gallery of past teams.** A page, or a tab on the profile, showing the team the player recruited in each finished game, latest first. The teams are already saved with each game, so it needs no database change; the squad pics would show here once they exist, which does need somewhere to keep them.

## Done

Everything in the phases below has shipped. Each is documented where it lives:

- **The board, its animations, chat, the end of a game, menus, profile, collection, admin page and launch pictures:** [UI.md](UI.md).
- **XP and levels, coins and the daily bonus, rank and the leaderboard, card levels and frames, the rewards shown at the end of a game:** [PROGRESSION.md](PROGRESSION.md).
- **The bots' three levels, timers, idle players and the limits of the timing rules:** [ARCHITECTURE.md](../ARCHITECTURE.md).
- **Feedback from the menu**, as a feature request or bug report, with a tab on the admin page to move each from new to done.
- **Visits** recorded per signed-in stretch of activity, for the admin page.

## The original plan

The delivery phases as first laid out. Phases 1 and 2 are done; the Phase 3 candidates that were taken up are in the list above or done.

**Phase 1 — Engine + vs Computer + Profiles**
1. Scaffold (Next.js, Tailwind, shadcn/ui, Prisma/Neon, Auth0, pnpm).
2. Pure engine with exhaustive unit tests (Vitest) — every rule above, especially Time Stone, Avengers tile stealing, compound win condition, pending sub-moves. Engine honors `GameSettings` (target points, timers as data).
3. Card/location datasets.
4. Bot policy + tests (bot vs bot simulations must always terminate legally).
5. Game setup screen (settings form: target points, bot difficulty) + game UI (board, tap interactions, animations) wired to vs-bot API.
6. Auth0 profiles, R2 avatar upload, stats recording, profile pages.
7. OpenAI banter bubbles.

**Phase 2 — Live multiplayer**
8. Game creation/join-code flow, lobby with presence, guest identity, full settings form (turn timer, game clock).
9. Pusher integration, per-seat redacted views, reconnect handling.
10. In-game chat + emoji reactions.
11. Turn-timer/game-clock enforcement (client countdown + claim-timeout backstop, bot takeover on repeated timeouts).
12. Mixed games (humans + bot fill), abandonment handling, multiplayer stats.

**Phase 3 — polish (post-v1 candidates)**: spectators, rematch, game history/replay viewer (we already store the move log), leaderboards, OpenAI post-game recaps and AI avatars.
