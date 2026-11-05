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

Written 2026-11-05 on branch `feature/ops-1105-friends`. Lines marked **(assumption)** were decided for this plan and were not asked for; any of them can be overturned.

**What it is for.** A signed-in player can keep a list of the people they play with, see which of them are online, and pull one into their room with a tap instead of sending a room code by text. It works when a player invites a friend from the lobby and the friend lands in that lobby, seated, without typing a code.

### Decided

These were open in the old roadmap line.

- **A friendship needs accepting.** A request waits until the other player accepts it. **(assumption)**
- **Profiles stay open to everyone**, as they are today. Friends see nothing more than anyone else. **(assumption)**
- **Friends are found by username**, the name already unique and shown on the leaderboard and profiles. No separate friend code. **(assumption)**
- **Only signed-in players have friends.** Every seat in a room is already a signed-in player (`lib/lobby.ts`).

### Phases

Both phases land on `feature/ops-1105-friends`. Phase 1 can ship alone.

**Phase 1: friends.** The Friends button, the Friends screen, requests (send, accept, decline, cancel), the friends list with online status, remove, block and unblock, and the friend button on a profile. Counts reach the player on page load and by a slow poll; no live channel yet.

**Phase 2: invites.** Invite a friend from the lobby, the invite list on the Friends screen, the pop-up on the menus when an invite arrives, and a private live channel per player so requests and invites show at once.

**Later, not in this plan:**
- Web push to a phone with the app closed (on an iPhone it needs the app on the home screen).
- Inviting from the Friends screen when you have no room open (it would create one).
- Searching by part of a name; this plan needs the exact username.
- Showing "In a game" or which game a friend is in; spectating a friend.
- A friends-only leaderboard, friend counts on profiles, friends-only profiles.
- Email about requests or invites.
- Friends for guests.

### Home screen

- The footer today is: Shop, an empty `w-14` spacer that keeps the middle line centred against the two buttons on the right, the middle line, Leaderboard, How to play (`components/home/HomeScreen.tsx`).
- **The Friends button takes the spacer's place, to the right of Shop.** The footer becomes Shop, Friends, the middle line, Leaderboard, How to play: two round buttons each side, so the middle stays centred.
- It is the same round button as Shop and Leaderboard (`size-14`, `bg-cosmos-700`, `ring-cosmos-500`, gold icon), with Lucide `Users`, `aria-label="Friends"`, and links to `/friends`.
- It wears the gold new dot (`NewDot`) while the player has a friend request or a room invite waiting. The count comes from the server with the home page, not from the device as the Shop's dot does, because it is about the account. Phase 2 also updates it live.

### The Friends screen, `/friends`

A menu screen like the shop: `<Stage>`, `<StageRows>`, `<TopBar />`. Visitors who are not signed in go to sign in and come back (`/auth/login?returnTo=/friends`). The UI Designer lays it out from [DESIGN.md](DESIGN.md); this is what it must hold.

- **Down the left**, like the shop's shelves: Friends, Requests (with a count while any are waiting), Blocked, and Back.
- **Friends tab.** An Add friend field and button at the top. Below, the friends list: picture (`PlayerAvatar`), username, name if set, and a green Online dot or nothing. Online friends first, then the rest, each part by username A to Z. Tapping a friend shows them on the right with View profile, Remove and Block. The list scrolls inside its own box; the page never scrolls.
- **Requests tab.** Received requests first, each with Accept and Decline. Then sent requests, each with Cancel. In Phase 2, room invites sit above both, each with Join and Decline, saying who invited and whether it is the Marvel game or a Duel.
- **Blocked tab.** Each blocked player with Unblock.
- **Empty states.** No friends: "No friends yet. Add one by their username." No requests: "Nothing waiting." Nobody blocked: "You haven't blocked anyone."
- **Remove and Block ask first**, in the screen's one dialog, the destructive button last.

### On a profile

On someone else's profile (`app/profile/[username]`), for a signed-in viewer, one button shows where they stand: Add friend, Request sent (tap to cancel), Accept request, or Friends (tap for Remove). Nothing shows on your own profile, to a visitor not signed in, or between players where either has blocked the other.

### In the lobby (Phase 2)

- Beside the room code (`components/lobby/ShareCode.tsx`), anyone seated sees an Invite friends button (round, Lucide `UserPlus`, `aria-label="Invite friends"`). The room code is already shown to everyone seated, so anyone seated may invite. **(assumption)**
- It opens a dialog listing friends, online first, each with Invite. After a tap the button reads Invited and is disabled. Friends already seated are left out. With no friends: "Add friends from the home screen." and nothing else.
- With no free seat the button is disabled.

### When an invite arrives (Phase 2)

- On any menu screen with the top bar (home, profile, settings, Play Game, Duel, lobby), a toast through the `Toaster` already mounted in `app/layout.tsx`: "<username> invited you to a game", with Join and Not now. Not now only closes the toast; the invite stays on the Requests tab.
- Not on the board. A player in a game sees it on the Friends screen afterwards.
- Join seats the player through `joinLobby`, so full rooms, started games, closed rooms and the open-games cap are refused there, with its own message. On success it goes to `/lobby/<id>`. The invite is marked accepted only if the seat was taken.

### Data model

Four new tables and two enums, nothing changed or removed. Every relation to `User` deletes with it (`onDelete: Cascade`), so `deleteAccountAction` keeps working without a change. The SQL goes in `prisma/sql/<date>-friends.sql` beside the earlier ones, plus the back-relations on `User` in `schema.prisma`.

```prisma
enum FriendRequestStatus {
  PENDING
  DECLINED
}

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

// Phase 2. Only shown while its game is still a room (LOBBY) with a free seat.
model GameInvite {
  id         String           @id @default(cuid())
  gameId     String
  game       Game             @relation(fields: [gameId], references: [id], onDelete: Cascade)
  fromUserId String
  from       User             @relation("InvitesSent", fields: [fromUserId], references: [id], onDelete: Cascade)
  toUserId   String
  to         User             @relation("InvitesReceived", fields: [toUserId], references: [id], onDelete: Cascade)
  status     GameInviteStatus @default(PENDING)
  createdAt  DateTime         @default(now())

  @@unique([gameId, toUserId])
  @@index([toUserId, status])
}
```

- `Game` gains `invites GameInvite[]`; `User` gains the eight back-relations named above.
- The two `Friendship` rows are written and deleted together in one transaction.
- Applying the SQL to any database, including production, is the Commander's call, as with every schema change.

### Rules

In `lib/friends.ts`, with the parts that need no database in a pure file (`lib/friend-rules.ts`) so they can be tested like `lib/lobby-rules.ts`.

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
- **Block**: makes the `UserBlock` row, deletes the friendship and requests both ways, and marks their waiting room invites to you declined. Unblock deletes the row and restores nothing.
- **Online** means `UserVisit.lastSeenAt` within the last 5 minutes. **(assumption)** That column is already written when a signed-in page loads, at most once a minute (`lib/record-visit.ts`); no new tracking.
- **Invite** (Phase 2): only a player seated in that room; only to a friend; only while the room is in the lobby with a free seat; not to someone already seated. Inviting the same friend to the same room twice is a no-op. An invite is shown only while its room is still in the lobby, not full and not closed by `closeIfHostGone`; otherwise it is left out of every list and count.
- **Join** (Phase 2): only the invitee; calls `joinLobby(userId, game.joinCode)` and marks the invite accepted only when that succeeds.

### Limits against abuse

**(assumption)** for each number.

- At most **200 friends**. A request that would pass it, for either player: "Friends list is full."
- At most **20 sent requests waiting** at once.
- At most **30 friend requests sent in a day** (rolling 24 hours, counted from `createdAt`).
- At most **10 invites from one player to one room**.
- Every action checks the session first and returns the same "Not found" whether a row is missing or belongs to someone else.

### Actions and routes

Mutations are server actions, as the shop, settings and private rooms do it; reads for the poll and the live channel are route handlers. Inputs are checked with zod as in `lib/api-schemas.ts`.

| Where | What |
|---|---|
| `app/friends/page.tsx` | The Friends screen |
| `app/friends/actions.ts` | `sendFriendRequestAction(username)`, `respondFriendRequestAction(id, accept)`, `cancelFriendRequestAction(id)`, `removeFriendAction(userId)`, `blockPlayerAction(userId)`, `unblockPlayerAction(userId)` |
| `GET /api/friends` | The signed-in player's friends with online state, requests both ways, invites (Phase 2) and the waiting count, for the screen's poll and the live refetch |
| `app/lobby/[gameId]/actions.ts` (Phase 2) | `inviteFriendAction(gameId, friendId)` |
| `app/friends/actions.ts` (Phase 2) | `respondInviteAction(id, accept)`, which redirects to the lobby on a successful join |
| `POST /api/pusher/auth` (Phase 2) | Pusher channel auth. Signs only `private-user-<own id>` for the signed-in player; anything else gets 403 |

### Live updates (Phase 2)

- A private channel per player, `private-user-<userId>`, named in a new `lib/user-channel.ts` beside `lib/game-channel.ts`.
- One event, `friends-updated`, with **no data**, on the same rule as the game channel: it only says "fetch again", so nothing leaks through it. Sent to the receiver on a new request or invite, to the sender when one is accepted, and to both on remove or block.
- `lib/pusher.ts` gains `notifyUser(userId)` and the channel-auth call; it never throws, as `notifyGame` doesn't.
- The client side is one hook, mounted from the top bar, that refetches `GET /api/friends` on the event, on `visibilitychange`, and every 30 seconds as the safety net, the same pattern as `components/game/use-game-updates.ts`. Without Pusher keys it still works on the poll.
- In Phase 1 the Friends screen polls `GET /api/friends` every 30 seconds while it is open, and the home page reads the count when it loads.

### Edge cases

| Case | What happens |
|---|---|
| No friends, no requests, nobody blocked | The empty-state lines above |
| Friend renames themselves | Shown by their new username; rows hold the user id |
| Friend deletes their account | Their rows go with the account; they drop off the list |
| Friend is blocked by an admin | They stay on the list, never shown online; they can't be invited |
| Both send each other a request at once | One becomes a friendship; the unique key and the accept-on-cross rule keep it to one pair of rows |
| Accept tapped twice | The second does nothing |
| Invite to a room that then fills, starts or closes | The invite disappears; Join from a stale toast shows `joinLobby`'s reason ("That game is full.", "That game has already started.", "That room has closed.") |
| Invited player already has two games open | Join shows the open-games message; the invite stays waiting |
| Invited player is already in the room | Not offered in the invite list; if it happens anyway, Join takes them to the room |
| Duel room, two seats | Same rules; full after one guest |
| Offline or the action fails | A toast says it didn't go through; nothing changes on screen |
| Pusher not set up | Everything works on the 30-second poll |
| 200 friends | The list scrolls in its box |
| Cheat codes | Not carried by invites |

### Docs and release

- [ARCHITECTURE.md](../ARCHITECTURE.md): the four tables in the data model, the new routes, and the private user channel in the realtime section. Section 5 there describes presence channels and an auth endpoint that the code does not have today; the game channel is public and signal-only. Fix that line while there.
- [UI.md](UI.md): a Friends section, and the footer line in "Menu screens" names the Friends button.
- `data/updates.json` and `package.json`: a MINOR release (3.2.1 to 3.3.0 at the time of writing) in player words.
- When it ships, this section shrinks to a line under Done.

### Acceptance criteria

Numbered for the build and the test. Two signed-in test accounts, A and B, on a database with the new tables. **Phase 1:**

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

**Phase 2:**

18. Given A is seated in a room with a free seat, the Invite friends button is beside the room code; its dialog lists A's friends, online first, and leaves out friends already seated.
19. When A taps Invite on B, the button reads Invited; tapping again makes no second invite row.
20. Given B is on a menu screen with the top bar, within 5 seconds of A's invite (Pusher configured) a toast shows "<A's username> invited you to a game" with Join and Not now; without Pusher it shows within 35 seconds.
21. When B taps Join, then B lands in A's lobby, seated, and A's lobby shows B without a reload.
22. Given the room filled, started or closed before B taps Join, then B sees `joinLobby`'s reason and is not seated, and the invite no longer appears in B's Requests tab.
23. Given B already has two games open, Join shows the open-games message and the invite stays on B's Requests tab.
24. When B declines an invite, it leaves B's lists and A can't invite B to that room again.
25. B on the board gets no toast; the invite is on B's Requests tab afterwards.
26. A subscription to `private-user-<someone else's id>` is refused by `POST /api/pusher/auth` with 403.
27. The 11th invite from A to the same room is refused with a message.

### Checks for a PASS

- `pnpm exec vitest run`, all passing, including new tests for `lib/friend-rules.ts` (every rule and limit above that needs no database) and for the friends actions in the style of `tests/lobby.test.ts`.
- `pnpm exec tsc --noEmit`, no errors.
- `pnpm lint`, no errors.
- `pnpm build`, succeeds.
- The acceptance criteria above walked by hand with two accounts in two browsers, at a phone-sized landscape viewport, on a database that is not production.
- The home footer and the Friends screen compared with DESIGN.md: round buttons, the one-dialog rule, focus rings, `aria-label`s, no page scroll.

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
