# Marvel Splendor — Architecture

A web implementation of **Splendor: Marvel Edition** (Space Cowboys / Marc André). Play vs. a computer opponent or host a live game session friends join with a share code. Signed-in users get a persistent profile with stats and an avatar. Games are configurable (turn timer, game clock, target points) and include in-game chat and emoji reactions.

**Product inspiration:** [Ephod](https://the-ephod.com/) (iOS/Android) — a Splendor-mechanism mobile game with real-time multiplayer, private games, and rankings. The approved game-screen layout reference is an Ephod screenshot.

> Status: **awaiting approval** — no code has been written against this doc yet.

---

## 1. Game rules reference (verified against the official rulebook)

Source: official Space Cowboys rulebook PDF, cross-checked with BoardGameGeek and multiple reviews. These rules drive the engine; the Marvel edition is **not** a pure reskin of base Splendor.

### Components
| Component | Count | Notes |
|---|---|---|
| Character cards (dev cards) | 90 | Level 1: 40 · Level 2: 30 · Level 3: 20 |
| Infinity Stone tokens (basic) | 7 each | Mind (yellow), Space (blue), Soul (orange), Power (purple), Reality (red) |
| Time Stone tokens (green) | 4 | Special — see below |
| S.H.I.E.L.D. tokens (gray) | 5 | Wildcard, gold-equivalent; only obtainable by reserving |
| Location tiles (nobles) | 4 | Random `playerCount` tiles used per game; 3 pts each |
| Avengers Assemble tile | 1 | Contested; 3 pts; stealable |

Setup token supply: 2p → 4 of each basic + 2 green; 3p → 5 of each basic + 3 green; 4p → 7 of each basic + 4 green. Gray always 5. Market: 4 face-up cards per level, refilled immediately.

### Card anatomy
Cost (basic colors only) · bonus color granted (one of the 5 basic colors) · Infinity Points (0+) · 0–2 **Avengers tags** · all Level 3 cards bear the Time Stone icon.

### Turn: exactly one action
1. **Take 3 tokens of different basic colors** (fewer if fewer colors available). Green/gray never takeable this way.
2. **Take 2 tokens of one basic color** — only if that stack has ≥ 4 before taking.
3. **Reserve a card** (face-up, or blind top-of-deck) + take 1 gray token if any remain. Max 3 reserved; reserved cards can never be discarded.
4. **Recruit a card** (from market or own reserve). Pay cost minus 1 per matching owned bonus; gray is wild. Green is never spent.

End-of-turn automatic effects, in order:
- **Time Stone**: first time a player recruits any Level 3 card, they take 1 green token (max 1 per player, ever; cannot be returned or spent).
- **Avengers Assemble tile**: if the player's total Avengers tags now **strictly exceeds** the current holder's (or reaches ≥ 3 when unclaimed), the tile moves to them.
- **Location tiles**: player automatically claims **at most one** Location whose bonus requirement they meet (their choice if several qualify).
- **Hand limit**: if over 10 tokens (all colors counted), return down to 10, player's choice — but green can never be returned.

### Win condition & endgame
End trigger: a player has **≥ 16 Infinity Points AND ≥ 1 bonus of each of the 5 basic colors AND the green Time Stone**. Finish the round (equal turns). Among qualifying players: (1) most points; (2) Avengers Assemble tile holder; (3) fewest character cards; (4) shared victory. Edge case: if the trigger-er loses the Avengers tile (dropping below 16) before the round ends, the game continues.

Players: 2–4. Turn order clockwise from a random starter.

### Card dataset caveat
The official 90-card cost table is not published as data. We ship a `cards.json` dataset mirroring base Splendor's well-known cost distribution per level, with points and Avengers tags assigned to match the Marvel edition's counts. Marked clearly in the repo so it can be corrected card-by-card against a physical copy later. Game asset images are supplied by the project owner. Card `name`s are placeholders too (real Marvel characters, not matched to the physical deck). A card with an `image` renders that image as the whole card; without one the UI draws a placeholder card face.

### Extensibility guarantee
The engine is data-driven: it makes no assumption about deck sizes. Cards, Locations, and per-player-count token supplies are all loaded from `data/` — adding, removing, or rebalancing cards is a JSON change (plus an asset image keyed by card id), never a code change. Game state and the move log reference cards by stable id, so expansions are backward-compatible with saved games and replays as long as existing ids are never reused or mutated.

---

## 2. Stack

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router, TypeScript, **no `src/` folder**) |
| Styling / components | Tailwind CSS + shadcn/ui (Radix primitives) + Lucide icons |
| Input | Tap/click only — no drag interactions |
| ORM / DB | Prisma + Neon Postgres |
| Auth | Auth0 (`@auth0/nextjs-auth0`); guests allowed for joining games |
| Realtime | **Pusher Channels** (presence channels for lobby/seats; server broadcasts state) |
| Storage | Cloudflare R2 (S3 API) for profile avatars |
| AI flavor | OpenAI — bot table-talk/banter only (moves are rules-based) |
| Hosting | Vercel · Package manager: pnpm |

---

## 3. High-level architecture

```
Browser (Next.js client)
 │  actions: POST /api/games/[id]/moves  ── validate → apply → persist
 │  reads:   RSC initial load + Pusher `game-{id}` events for live updates
 ▼
Next.js route handlers (Vercel serverless)  ←→  Pusher Channels (broadcast)
 │
 ├── lib/engine/*  — pure TS game engine (no I/O)
 ├── lib/bot/*     — deterministic bot policy over the engine
 ├── Prisma → Neon Postgres (authoritative game state, users, stats)
 ├── R2 (avatars, presigned upload)
 └── OpenAI (bot banter, fire-and-forget)
```

**Server-authoritative, event-sourced-lite.** The client never mutates state; it submits a `Move`. The server loads the game, validates via the pure engine, appends the move to a `Move` log, stores the new state snapshot, and broadcasts. Optimistic concurrency via a `version` int on `Game` prevents double-submits and race conditions between serverless invocations.

### The engine (`lib/engine/`)
Pure, framework-free TypeScript — the heart of the project and fully unit-testable:

- `types.ts` — `GameState`, `PlayerState`, `Move` (discriminated union: `TAKE_THREE`, `TAKE_TWO`, `RESERVE`, `RECRUIT`, `RETURN_TOKENS`, `CHOOSE_LOCATION`), `Color` enum (5 basic + `TIME` + `SHIELD`).
- `setup.ts` — seeded-RNG game creation (shuffles reproducible from stored seed).
- `validate.ts` — `legalMoves(state, playerId)` and `validateMove(state, move)`.
- `apply.ts` — `applyMove(state, move) → GameState` including all end-of-turn automatics (Time Stone grant, Avengers tile movement, Location claims, hand-limit sub-turn, end-trigger detection, final tiebreak).
- `view.ts` — `redact(state, viewerId)` hides deck order, opponents' blind-reserved cards, and remaining deck contents from clients.

Some turns need a follow-up decision (return tokens over 10; choose between multiple earned Locations). These are modeled as **pending sub-moves**: the state carries `pendingAction`, and only that player may resolve it before play advances. The bot resolves them inline.

### The bot (`lib/bot/`)
Deterministic heuristic policy (no LLM in the loop): greedy scoring over `legalMoves` — weighted by progress toward affordable high-value cards, color-set completion (win condition needs all 5 bonuses), Time Stone acquisition, Avengers-tag races, and token efficiency. Difficulty tiers adjust lookahead/weights. Bot turns run server-side immediately after a human move in the same request (or a follow-up invocation), so vs-computer games need no realtime infra at all. OpenAI generates an in-character quip about the move it just made (non-blocking; failures are silent).

---

## 4. Data model (Prisma sketch)

```prisma
model User {          // Auth0-linked profile
  id            String   @id @default(cuid())
  auth0Sub      String   @unique
  username      String   @unique
  avatarKey     String?              // R2 object key
  createdAt     DateTime @default(now())
  players       GamePlayer[]
  stats         UserStats?
}

model UserStats {
  userId        String  @id
  user          User    @relation(fields: [userId], references: [id])
  gamesPlayed   Int @default(0)
  wins          Int @default(0)
  vsBotWins     Int @default(0)
  bestPoints    Int @default(0)
  fastestWinTurns Int?
  avengersTilesWon Int @default(0)
  locationsClaimed Int @default(0)
}

model Game {
  id          String     @id @default(cuid())
  joinCode    String     @unique      // 6-char human-friendly code
  status      GameStatus               // LOBBY | ACTIVE | FINISHED | ABANDONED
  mode        GameMode                 // VS_BOT | MULTIPLAYER
  seed        String                   // reproducible shuffle
  settings    Json                     // GameSettings (see below), frozen at start
  state       Json                     // current GameState snapshot
  version     Int        @default(0)   // optimistic concurrency
  winnerSeat  Int?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  players     GamePlayer[]
  moves       Move[]
  messages    ChatMessage[]
}

model ChatMessage {
  id        String   @id @default(cuid())
  gameId    String
  seat      Int
  kind      ChatKind                  // TEXT | REACTION
  body      String                    // text (length-capped) or reaction emote id
  createdAt DateTime @default(now())
  @@index([gameId, createdAt])
}

model GamePlayer {
  id          String  @id @default(cuid())
  gameId      String
  seat        Int                       // 0..3, turn order
  userId      String?                   // null for guests & bots
  guestName   String?
  isBot       Boolean @default(false)
  guestToken  String?                   // httpOnly-cookie secret for guest identity
  @@unique([gameId, seat])
}

model Move {
  id        String   @id @default(cuid())
  gameId    String
  ordinal   Int                         // move sequence number
  seat      Int
  payload   Json                        // the Move union
  createdAt DateTime @default(now())
  @@unique([gameId, ordinal])
}
```

The `Move` log + `seed` makes every game replayable/auditable; `state` is a materialized snapshot so reads are cheap.

### GameSettings (chosen by the host at creation, editable in lobby, frozen at start)

```ts
type GameSettings = {
  turnTimeSeconds:  15 | 30 | 60 | 120 | null;  // null = untimed turns
  gameTimeMinutes:  10 | 20 | 30 | null;        // optional overall game clock
  targetPoints:     number;                      // default 16 (rulebook); host may raise/lower
  botDifficulty?:   'easy' | 'normal' | 'hard';  // vs-bot games
};
```

`targetPoints` only changes the point threshold — the full-color-set and Time Stone requirements of the compound win condition stay fixed. If the game clock expires before anyone triggers the end condition, the round finishes and standings are decided by the normal tiebreak order.

---

## 5. Realtime & session flow (Pusher)

- **Create game** → row in `LOBBY` status with generated `joinCode`; host shares the code/link (`/join/CODE`).
- **Join** → signed-in users join as themselves; guests pick a display name and get an httpOnly `guestToken` cookie tied to their `GamePlayer` row.
- **Lobby** → presence channel `presence-game-{id}` shows seats filling live; host starts the game (2–4 seats, bots can fill empty seats).
- **In game** → moves POST to the server; on success the server triggers `move-applied` on private channel `private-game-{id}` with `{ordinal, redactedStatePerSeat…}` (per-seat redaction handled by clients fetching their own view, event carries the public delta). Pusher auth endpoint verifies session/guest cookie before channel subscription.
- **Reconnect** → client refetches `GET /api/games/[id]/view` (redacted for the viewer) and resumes from the live channel; missed events are irrelevant because state is snapshot-based.
- **Chat & reactions** → `POST /api/games/[id]/chat` persists a `ChatMessage` (text length-capped, basic rate-limited per seat) and triggers `chat` on the game channel. Reactions are the same pipeline with `kind: REACTION` and a curated emote set (Marvel-flavored quick reactions), rendered as transient bubbles over the sender's plaque. Chat history loads with the game view so reconnects/spectators see context.
- **Turn timer enforcement (serverless-safe)** → when a move is applied, the server stamps `turnDeadline` into the state and broadcast. The active player's client shows the countdown and auto-submits a timeout locally at zero; as backstop, **any** participant can `POST /api/games/[id]/claim-timeout` after the deadline — the server verifies wall-clock vs. `turnDeadline` and applies a `TIMEOUT_SKIP` move (resolving any pending sub-move with a default, e.g. auto-return highest-count tokens). Three consecutive timeouts marks the seat inactive and a bot takes it over. The optional game clock works the same way: deadline stored at start, checked lazily on every move.
- **Timeouts/abandonment** → a stale `ACTIVE` game past a TTL can be marked `ABANDONED` (checked lazily on access — no cron needed for v1).

vs-Bot games skip Pusher entirely: the move POST response contains the bot's reply move(s) and new view.

---

## 6. App structure & routes

```
app/
  layout.tsx, page.tsx           # landing: Play vs Computer / Create / Join
  play/[gameId]/page.tsx         # game board (both modes)
  join/[code]/page.tsx           # join flow (auth or guest name)
  lobby/[gameId]/page.tsx        # pre-game lobby
  profile/[username]/page.tsx    # public profile + stats
  settings/page.tsx              # own profile edit, avatar upload
  api/
    auth/[auth0]/route.ts        # Auth0 handlers
    games/route.ts               # POST create
    games/[id]/route.ts          # GET view (redacted)
    games/[id]/moves/route.ts    # POST move
    games/[id]/join/route.ts     # POST join by code
    games/[id]/start/route.ts    # POST host starts
    games/[id]/chat/route.ts     # POST chat message / reaction
    games/[id]/claim-timeout/route.ts  # POST timeout backstop
    pusher/auth/route.ts         # channel auth
    avatar/upload/route.ts       # presigned R2 PUT + confirm
components/
  game/  (Board, CardMarket, Card, TokenBank, TokenChip, PlayerPlaque,
          LocationTile, AvengersTile, ReserveTray, HandTray, EndTurnBar,
          MoveLog, BanterBubble, GameOverDialog, TurnTimer,
          ChatPanel, ReactionPicker, ReactionBubble)
  lobby/ (SoloGameScreen, PrivateGameScreen, Option, SeatList, ShareCode)
  ui/    (shadcn/ui generated)
lib/
  engine/  bot/  db.ts  pusher.ts  r2.ts  auth.ts  openai.ts
data/
  cards.json  locations.json
prisma/schema.prisma
```

### Game screen (per the approved UI reference)
Built for a landscape phone first: one non-scrolling canvas, 100 spacing steps tall and at most 200 wide, that scales to fit any viewport (`.game-board` in `app/globals.css` redefines Tailwind's spacing/text variables, so every size inside the board scales together). Left column: opponent plaques (avatar, name, Avengers tags, reserved cards, points, bonuses/tokens per color, active-turn ring, turn timer). Center: three level decks (III/II/I) each with a 4-card face-up row. Right: token stacks with counts, then target points, menu (move log), Location tiles and the Avengers tile. Bottom: the viewer's plaque with the tokens being taken this turn, their tray (`n/10`, bonuses/tokens per color, reserved cards), and End Turn. Upright phones get a rotate-your-device screen. All input is tap/click: tapping a card lifts it over a dimmed board with Recruit/Reserve actions, tapping a token stack stages a token (tap it in the tray to put it back), tapping a deck stages a blind reserve; End Turn submits.

---

## 7. Auth, profiles, storage

- **Auth0**: Universal Login; `auth0Sub → User` upsert on first login with a username-picker step. Session via the Auth0 Next.js SDK.
- **Guests**: no account; identified per-game by `guestToken` cookie; their stats are not recorded. A guest can later sign up, but v1 does not migrate past guest games.
- **Avatars**: client requests a presigned R2 PUT (size/type-limited), uploads directly, confirms; we store the object key and serve via R2 public bucket/custom domain. OpenAI avatar generation is out of scope for v1 (deferred).
- **Stats**: updated transactionally when a game reaches `FINISHED` — games played, wins, best points, fastest win, Avengers tiles won, Locations claimed.

---

## 8. Delivery phases

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

**The end of a game (done)**

The popup at the end of a game shows how the whole table finished, with the viewer's row in gold (`components/game/GameOverDialog.tsx`). A win is gold: the Avengers badge in turning rays, with the stones raining down. A loss is red: Thanos, looming. The title lands with a bounce and the rows arrive one at a time. "View board" closes it to look over the final board, where a "Results" button brings it back. The standings list is shared with the profile's Game Record (`components/game/Standings.tsx`). All of the movement is left out for anyone who has asked their device for less motion. To look at it without playing a game, open `/preview/game-over`: it plays the screen with a made-up table, for a win, a loss or a shared win, with two to four players.

**Animations on the board (done)**

So nobody has to guess what another player did, the board shows it.

- **An outline on what was picked.** Tokens, a card, a deck or a reserved card another player picks is outlined in gold for a second and a half before it leaves the board. The outline is a line drawn clockwise from the top until it is whole; only then is it taken up, the same way round, until it is gone. A player's own picks are not outlined. A bot's outline comes out of its thinking time, so bots are no slower.
- **Announcements.** Claiming a Location, taking or stealing the Avengers tile, and getting the Time Stone each stop the game for everyone: three seconds for a tile, five for the Time Stone, whose announcement fades away together with its light. A tile is carried from its place on the board to the middle of the screen: it is a copy of the very tile that was on the board, so there is nothing to load and no flash. The Time Stone is shown by the Eye of Agamotto, drawn in aged brass cut with markings, with a casing the shape of an eye and the works of a skeleton clock behind the cage (the markings are strokes, not letters, so no device needs a font for them): a gold sphere splits along a slit and its halves part all the way to show the stone, behind a cage of four rings stacked one on another. Each ring carries one bar and turns about the middle of the Eye, the next the opposite way to the last and none at quite the same pace. They start with their bars crossed over the sphere and come to rest with two along the top of the opening and two along the bottom, like the lids of an eye. The bars' shapes, starting places and order in the stack were measured off frames of the real thing. The green light comes up only as it opens, then spreads from the stone out over the screen and fades. Behind the cage small wheels turn under a brass ring. Nothing in the Eye is blurred or filtered, and nothing is drawn outside its own box: Safari gets both wrong on a piece that is growing. The casing and the rim each have a layer of their own (`will-change-transform`); without one Safari paints them into the layer of the light behind them, and they vanish with it. The "Your turn" banner and the results wait until they are over.
- **Where it lives.** `lib/board-events.ts` works out what a move brought about by comparing the board before and after. `components/game/Announcement.tsx` draws it, and `playSteps` in `GameBoardClient.tsx` plays it. The outline is the `trace` style in `globals.css`.
- **Looking closer.** Tapping the win tile, a Location, the Avengers tile, a player's reserved cards or team, or a card's View glides it from its place on the board to the middle of the screen, and tapping it away fades it (`ZoomedView` in `components/game/Zoomable.tsx`). It shares its glide with the announcements (`components/game/glide.ts`).
- **To look at them without playing**, open `/preview/board`. Adding `?show=TimeStone&at=300` to the address plays one and stops it that many milliseconds in.
- **The preview pages** are the board (`/preview/board`), its loading screen (`/preview/loading`) and the end of a game (`/preview/game-over`). Each has a bar along the bottom (`app/preview/PreviewBar.tsx`): back to the main menu, the three pages to move between, and a `?` that lists everything a page takes in its address, each value a link that goes there. The board takes `?players=2`, `3` or `4` for how many are at the table, three when left out. A button on its bar shows the number and goes round them: 2, 3, 4, and back to 2. The list in the help is checked against what the pages take, so neither drifts from the other.
- **The glide is taken back when it is set up twice.** In development every effect is run twice; the second start used to measure the tile mid-flight and leave it standing in the middle of the screen.
- **Turn clocks.** A turn's clock starts once the animations before it are over, as it already did for a bot's thinking time. The player who moved skips the outline of their own pick, so their device is a second and a half ahead of the others'. That is inside the three seconds a device waits before timing another player out.
- **Less motion.** For anyone who has asked their device for less motion, the outline and announcements appear without moving.

**Loading the board (done)**

While a game loads, the board is drawn in outline on the night sky: the player cards, each with the tab for its name, the three decks and their cards, the token piles, the tiles, the trays and End Turn, each in its own place and shape (`components/game/BoardSkeleton.tsx`). They pulse gently, and stay still for anyone who has asked their device for less motion. It shows two other players, as the number at the table isn't known until the game has loaded. To look at it, open `/preview/loading`.

**Cheat mode**

For testing: it outlines the cards the player can afford. It is on when the board's address has `?cheat=true`. Typing `+cheat` after a room's code when joining, or on its own in the room code box when creating a room, turns it on; the lobby carries it on to the board. It only changes what that one player is shown.

**Chat and emoji reactions (done)**

Players in a private game can send an emoji or a short message to the table. It pops in on the sender's card and pops out again.

| Step | State |
|---|---|
| 1. Sending: the lists, the send route and the limit | Done |
| 2. The player's card: the name on a strip of its own, with the chat button beside it | Done |
| 3. Bubbles: shown live to everyone, popping in and out, and on `/preview/board` | Done |

- **The button.** One small round smiley on the top right corner of the name's tab, to the left of the points (`components/game/ChatButton.tsx`). It opens a list above it: the emojis in a row, the messages under them in two columns. One tap sends.
- **Every player's card.** The picture and name stand on a tab on the card's top edge, narrower than the card, so they are easy to pick out. The card under it holds the tokens and bonuses, with the points on its top right corner. Tab and card are always outlined, with a line between them: the same faint edge as the trays, and gold, thicker and glowing on that player's turn. The glow is one glow cast by the tab and the card together, on a layer of its own under them (`.turn-glow` in `globals.css`): a glow on each met in a bright bar where the two join. The layer is edged in gold like the card, so the glow starts outside the edge, and its middle is cut out, so it never lies over what the card holds. The card itself is not filtered, which would trap the enlarged view of its reserved cards inside it. Both are edged with borders, the tab's foot lying on the card's top line, so the two line up whichever thickness is showing. The turn timer sits low on the card's edge, clear of the points.
- **The picture is larger than its tab on purpose.** It is a step and a half taller than the tab and sits over it, standing out the same amount over the tab's top and its foot, and a little over its left side. It is always a circle. It is drawn over the tab, not in it, so cutting off the tab's glow on a turn doesn't cut the picture.
- **Another player's card** also shows their Avengers tags on the tab, and their reserved cards standing on the card's top edge between the tab and the points. It is no taller than it was, so four players still fit.
- **The player's own card** is level with the trays and is left to the tokens being taken. The chat button is only there where something can be sent, so not in a game against the computer. To look at it on the player's turn, go to `/preview/board?show=MyTurn`, or `?show=Chat` for the list.
- **Off while waiting.** The button is off for 3 seconds after a send. If the server says it is too soon, as when sending from a second device, it stays off for as long as it says is left.
- **What is sent shows beside the sender's card** for 3 seconds (`components/game/ChatBubble.tsx`): it pops in, holds and pops out. Another player's shows on the top edge of their card, level with the name on its tab and straight after their reserved cards, so it reads as theirs. The player's own shows to the right of the button, above the points. It is only as wide as what it says, so an emoji is a small round bubble. Nothing on the player cards is covered. An emoji stays within the card's width. A message is longer and passes over the edge of the market's decks for those 3 seconds, and a tap goes through it to the deck. A new one from the same player takes the place of the last. For anyone who has asked their device for less motion it appears and goes without the pop.
- **The sender sees their own as soon as it is sent**, and everyone else when it arrives, so it is not shown twice to the sender.
- **To look at them without playing**, open `/preview/board` and press Emoji or Message: it shows on every card at once, with the longest message on the list. `?show=Message&at=1500` holds it still.
- **Only what is on the lists can be sent.** A short list of emojis and one of messages, in `lib/chat.ts`. Nothing is typed, so nothing needs moderating. A message is at most 20 characters, to fit across a name.
- **One send every 3 seconds per player.** The server checks it against the player's last saved send, so it holds across devices and servers (`app/api/games/[id]/chat/route.ts`).
- **Who can send.** A player in a private game that is in play or finished, so "Good game!" can be said at the end. Not a player marked away, and not in a game against the computer.
- **Everything sent is saved** in `ChatMessage`, with `kind` `REACTION` for an emoji and `TEXT` for a message. Clearing games clears it.
- **It travels in the live signal**, as the `chat` event on the game's channel, since it is meant for everyone at the table. If the live connection is down it is not shown later: it is only worth seeing in the moment.

**Menu screens: one layout (done)**

Every menu screen is laid out the same way, so they keep the same margins and the same top bar.

- **The top bar** (`components/TopBar.tsx`) shows the player's profile button, their wins, the game's name in the middle, and a menu button on the right. The menu opens a popup with Profile settings and Log out, and Admin for an admin. It is on the home screen, the profile, Profile settings, VS Computer, Private Game and the lobby. It is not on the board, the collection, the admin pages or the previews, and a visitor who isn't signed in doesn't see it.
- **A page adds it** by putting `<TopBar />` beside its screen. It fetches the player itself.
- **`StageRows`** leaves room for the bar and sets the margins: 4 steps at the sides and 3 at the bottom. The last thing in it is the footer; everything before it is the content, which sits in the middle of the room between the bar and the footer, with as much space over it as under. Screens have no header or title of their own.
- **The sizes** come from a canvas 100 steps tall and 200 wide that scales to the screen. The bar takes 17 of the 100, a footer about 13, leaving about 64 for a screen's content.

**Still to do**

- **Style the game menu.** The menu on the board, and its move log, game settings and forfeit popups, have the theme's colours but plain lists and default buttons. Bring them in line with the menus: the gold headings, pill buttons and icon-and-value settings used on the setup pages.
- **Sound effects and background music.** None yet. Sounds for taking tokens, recruiting, reserving, your turn, the timer running low, and winning or losing; music on the menus and the board. Needs a mute control that is remembered, and sound files the project has the right to use. Phones only play sound after the player's first tap.
- **Team against team at the end of a game.** A comparison of the teams each player recruited: heroes against villains, points, bonuses by stone, Avengers badges, and the strongest card on each side. It can be worked out from the saved game, as the stats are.
- **A "squad pic" at the end of a game.** A picture of the player's recruited team to keep or share. To decide first: put together from the card art the game already has, or drawn by an image model. The second costs money per picture and needs care over the use of Marvel's characters.
- **A gallery of past teams.** A page, or a tab on the profile, showing the team the player recruited in each finished game, latest first. The teams are already saved with each game, so it needs no database change; the squad pics would show here once they exist, which does need somewhere to keep them.
- **The squad in the Game Record.** Done: opening a game in the profile's Game Record shows the team the player recruited in it, under how the table finished, strongest first, in a row that drifts sideways for ever. It is an ordinary scrolling row that is moved along a little at a time, so it can be swiped either way as well; it waits while it is touched and for a moment after. Tapping a card shows it large (`components/profile/TeamMarquee.tsx`). The gallery above is the same teams on a page of their own.
- **A collection.** A page of every card in the game: the ones the player has recruited at least once are shown, and the rest are empty spaces with dotted outlines and a question mark. Three ways to look at it: one big grid; by level; or by group. By level and by group are laid out like a chart, with the level or group named down the side and its cards, found and not yet found, in a row beside it. What each player has found is kept in its own table, `CollectedCard`, so it outlasts the games: a card counts when the player recruited it themselves in a game played to the end. Abandoned games don't count, nor does anything the stand-in bot recruited. The table is added by `prisma/sql/2026-09-29-collected-cards.sql` and filled from past games by `pnpm collection:backfill`; `lib/collection.ts` reads the cards from a game's moves. When a game is played to the end its cards are saved then and there (`lib/save-collection.ts`, called from the moves route); a game ended by a forfeit counts, as it is finished, not abandoned. The backfill sets each count afresh from the games, so it also puts right anything that failed to save. The page is `/collection`, reached from the home screen and the player's own profile (`components/profile/CollectionScreen.tsx`). The cards are given the whole screen: the page has no logo or footer, the way back sits in the header, each row is filled from edge to edge, and the list runs off the bottom of the screen, fading only at the top. It has four views: one grid, by level, by group and by alliance (hero, villain or either side). The groups are the teams each card is marked with in `data/cards.json`, three at most: a team with three or more cards gets a row, and the rest go under Others. So marking new cards with a new team, such as X-Men, makes its row once it has three. A card in two teams is in both rows.
- **Friends.** Add friends by username, see their profiles, and invite them to a game. An invite sends a notification; opening it asks whether to join that game's lobby. Needs new tables for friendships and invites, which is a schema change. Notifications inside the app can use the live connection already there; ones that reach a phone with the app closed need web push, which on an iPhone only works once the app is on the home screen. To decide: whether a friendship needs accepting, and whether profiles stay open to everyone or only to friends.
- **A shop, paid for in coins.** Categories: backgrounds, card packs, Location tiles, and background music tracks. Depends on coins (below) and, for the music, on sound (above). Needs tables for what is on sale, what each player owns and what they have chosen to use, which is a schema change. Coins must be given and spent on the server only, never on the device's say-so. To decide: how coins are earned; whether card packs and Location tiles change how they look or add new ones to the game, since new ones change the rules and everyone at a table must play with the same set; and whether coins can ever be bought, which would make the game commercial and needs the rights to the characters.
- **Harder bots.** Even on hard, the bot plays weakly and rarely comes close to winning. Why: it scores each move by how the board looks straight after it and takes the best, looking one move further ahead on hard and no further. It has no plan for winning, takes no account of what the other players are about to do, and never acts to stop them. To do: have it aim at the win itself (the points, one card of each colour and the Time Stone), plan several turns ahead towards chosen cards, and watch its opponents, reserving or taking what they need when they are close. Measure before and after: play bots against each other over many games and count wins and the turns a win takes, so that hard is shown to beat normal, and normal easy. Easy and normal should stay beatable. It stays a change to `lib/bot/policy.ts` alone, with no database change, and must keep choosing the same move for the same board, as games are replayed from their moves.
- **Levelling up cards.** A card in a player's collection gains levels the more times they recruit it. The count is kept already, as `times` on `CollectedCard`, so it needs no database change. To decide: how many recruits each level takes, what a level shows or gives, and whether it only changes how the card looks; anything that changes play would give long-time players an edge over new ones.
- End-to-end tests.
- Bot banter.
- Level, coins and rank.

**Corners**

Tiles and cards have different corners, as on the real game, and should not be given the same ones.

| Piece | Shape | Corners |
|---|---|---|
| Location tiles, Avengers Assemble tile | Square | `rounded-tile` (12% of the tile), everywhere they are drawn |
| Character cards on the board | Taller than wide | `rounded-md` |
| Character cards opened large | Taller than wide | `rounded-[10%/7.1%]` |

**Images (done)**

Pictures are resized and served as AVIF or WebP, and cached for a month. Each picture's address carries a fingerprint of its contents from `data/image-versions.json`, so replacing a picture gives it a new address and players fetch the new one. `pnpm dev` and `pnpm build` refresh the fingerprints; `pnpm images` does it by hand.

**iPhone launch image (done)**

An installed iPhone app shows a launch picture every time it opens: Thanos over the game's name on the night sky, with the stones adrift all round.

- **One picture per screen.** An iPhone only uses a picture made for its exact screen, so there is one per screen size, each way up. The screens are listed in `data/launch-screens.json` and the pictures are in `public/launch`.
- **The art is for a phone on its side.** The picture for a phone held upright is the same one turned a quarter, so it reads as "turn me". It reads the right way up once the phone is turned to the left.
- **The pictures are photographs of a page.** `/launch-art` draws the art (`components/LaunchArt.tsx`), and `pnpm launch:images` photographs it at every screen size. Run it, with the dev server running, after changing the art or adding a screen. It needs Google Chrome and a Mac.
- **Held a little longer.** iPhones take the launch picture down as soon as the app is ready, which cannot be changed. So the app holds the same art over itself for about two seconds as it opens, then fades it. This is in the installed app only, and plays again after signing in, since that reloads the app. Held upright, the art is turned a quarter to match the launch picture, and it covers the turn-your-phone notice until it fades: the sideways art already says to turn the phone.
- **The name is in a shipped font.** "Splendor" is set in Gelasio, which comes with the app, so it looks the same on every device and in the launch pictures.
- **Not covered:** iPads open on a plain dark screen. A phone that already has the app installed must remove and re-add it to pick up new pictures.

**Turn-your-phone notice (done)**

Every screen is laid out for landscape, so a phone held upright is shown a notice over everything: Thanos over the game's name and "Rotate your device to play", with the stones spread from top to bottom (`RotateNotice` in `components/LaunchArt.tsx`).

- **It runs on past the bottom edge** by the height of the status bar. An installed iPhone app measures the screen that much short when upright, which left a black bar along the bottom. The page behind is the night sky's darkest blue for the same reason.
- **Its pictures wait until it is shown.** It is drawn on every page, so its art is only fetched once the notice is on screen.

**Phase 4 — stats and profiles**

Player stats, shown on the profile page. The Records tab counts only games against at least one other person, as beating bots sets no records; a game with people and bots at the table counts. Done: they are worked out from how each of the player's finished games ended (`lib/career-stats.ts`, loaded by `lib/load-game-history.ts`), so they cover games already played and need no new columns.

| Stat | Meaning |
|---|---|
| Hero count | Heroes recruited, across all games |
| Villain count | Villains recruited, across all games |
| Most used hero | The hero recruited most often |
| Most used villain | The villain recruited most often |
| Average Infinity Points in wins | Mean points over games won |
| Highest Infinity Points in a win | Best winning score |
| Lowest Infinity Points in a loss | Worst losing score |
| Average Avengers badge count | Mean Avengers tags held at the end of a game |
| Biggest Avengers badge group | Most Avengers tags held at the end of any one game |

Profile:

- Profile picture: upload one, or choose one from a library of pictures. Done.
- Edit username. Done. Usernames are 3 to 20 characters: lowercase letters, numbers, `-` and `_`. The page looks the name up as it is typed and says whether it is free; the database's unique rule on `username` still has the last word when saving.
- **Scaling the username check (future).** Today each check is one lookup on the unique index, which is quick at this size. If sign-ups ever grow to where those lookups load the database, keep the taken usernames in a fast in-memory set in front of it: a Bloom filter or a Redis set. A name the set has never seen is free without asking the database; only a possible match is looked up. The unique rule stays as the last word either way.
- One Save button keeps the picture and the username together. Leaving with unsaved changes asks first. The browser's own back button is not caught. The Profile page links to it with "Edit profile"; it has no link back to the profile.
- Edit name. Done. A name is optional, up to 40 characters; the profile shows it with the username beneath.
- Profile and Settings pages in the box-art theme. Done. The profile is a gold-framed player card beside the stats, which are split over three tabs: Statistics, Records, and Heroes & Villains.
- Game Record. Done: a fourth tab lists the player's finished games, latest first, with their place, the number of players, rounds, final score and cards by level. Tapping a game shows how the whole table finished, under Victory or Defeat. It is read from the saved games (`lib/game-record.ts`), so clearing games clears it.
- Level, coins and rank. Planned, not started. None of these exist in the game yet; the results popup and the player card are where they would show.

What these need before they can be built:

- **Hero or villain per card.** Done: every card in `data/cards.json` has `side`: `"hero"`, `"villain"`, or `"both"` for one that could go either way. A `"both"` card counts once as a hero and once as a villain. A new card must be given one.
- **New stat columns.** Not needed today. The stats read every finished game the player was in, and clearing games (`pnpm games:clear`) clears them. `pnpm games:reset` clears the games and sets the seven older stats back to zero as well, so every stat starts again together. If either ever matters, keep running totals on `UserStats` instead.
- **Past games.** Done: covered by reading finished games.
- **A name and an email on the user.** `name String?` and `email String?` are in `prisma/schema.prisma`; `pnpm db:update` adds them to the database. The email is copied from the sign-in, and updated if it changes there. It is not unique, as one person can sign in more than one way, and it is never shown on a profile.
- **A picture library.** Done, with no schema change: the pictures are listed in `lib/avatars.ts`, and a chosen one is saved in `avatarKey` as `library/<id>`. They ship with the app, in `public/assets/pfp`; Cloudflare is only for pictures players upload. To add one, put a square picture in that folder and give it a line in the list. Uploaded pictures are saved under `avatars/`, so the two can't be confused.

**User metrics**

For the owner to review who is using the game and how much.

- **Visits. Done.** Every signed-in request notes that the user is active (`lib/record-visit.ts`, called from `getOrCreateUser`). A visit is one stretch of activity from one IP address: a request within 30 minutes of the last carries the visit on, and a longer gap or a new address starts another. Each `UserVisit` row holds the user, IP address, browser, when it started and when the user was last active. `pnpm db:update` adds the table; until then nothing is recorded and nothing breaks.
- **What is worked out from them.** Times joined is the number of visits, last joined is the latest, and time in the app is the length of every visit added up. Time spent playing comes from the saved games, so it needs nothing new.
- **Written at most once a minute per user**, after the response has gone out, so it never slows a page or a move. A failure to record is logged and never fails the request.
- **Switching network mid-visit counts as a new visit**, since the address changes.
- **A closed tab is not detected.** A visit ends at the user's last request, so a visit of a single request has no length.
- **IP addresses are personal data.** They are only ever shown on the admin page. A country or city can be worked out from them later, so neither is stored.
- **Admin page. Done.** `/admin/users` (`app/admin/users/page.tsx`, numbers from `lib/user-metrics.ts`). Admins get an Admin button at the bottom right of the main menu; nobody else is shown it.
  - **A Previews button** in its heading goes to the preview pages.
  - **Who may open it.** The emails in the `ADMIN_EMAILS` setting, separated by commas, and only once the sign-in has verified the email. Everyone else is told the page doesn't exist. With the setting empty, nobody can open it.
  - **Along the top,** seven boxes: who is online (seen in the last 5 minutes), games in play (moved in within the last 10 minutes), lobbies waiting, visits in the last 24 hours, users, and games finished and abandoned.
  - **Under them, three tabs in a row,** with the chosen one's view beneath: Open tables, Every user, Most sent. Open tables shows first. They are drawn like the tabs on the profile's stats (`components/admin/AdminTabs.tsx`).
  - **Open tables.** The 50 most recently touched games and lobbies with their players, round and last move. A game nobody has moved in for 10 minutes shows as "Left open".
  - **Every user**, latest seen first: sign-up date and how they sign in, visits, last joined, last seen, time in the app, time playing, games, wins, device and IP address. Hovering over Games or the IP address shows the split and every address used.
  - **Most sent.** Every emoji and message on the lists with how many times it has been sent, most first. One never sent shows 0, and one taken off the lists keeps its count. Clearing games clears the counts, as what was sent is saved with its game.
  - **Time playing** is each game's first move to its last, added up, so a lobby or a tab left open adds nothing. Clearing games clears it.
  - **It fetches its numbers again every minute, in place** (`components/admin/AutoRefresh.tsx`): the chosen tab and the place scrolled to are kept. It rests while its browser tab is out of sight and catches up when looked at again. It used to reload the whole page, in sight or not; one reload failing, as when the computer had slept, left an error page that never tried again.
  - **A load that fails shows a notice and tries again in a minute.**
  - **It reads every user and every visit each time.** Fine at this size; with thousands of users, show them a page at a time and add the visits up in the database.

## 9. Testing & correctness strategy

- Engine: property-style tests (token conservation invariants — supply + hands + spent always equals initial counts), scenario tests for every rulebook clause, full bot-vs-bot fuzz games from random seeds asserting no illegal state.
- API: integration tests for move validation, concurrency (stale `version` rejected), redaction (a client can never see deck order or hidden reserves).
- E2E happy paths (Playwright, later): create → join → play → finish.

## 10. Known limitations — turn timers and idle games

How the timing rules behave today, including the cases they do not cover. The rules live in `lib/game-replay.ts` (`turnEndsInMs`, `isTableIdle`) and the engine (`isAway`) and are applied in `app/api/games/[id]/moves/route.ts`.

**Idle games**

A player who misses three turns in a row is marked away, and a bot plays their seat from then on. They are told they were removed, and cannot take the seat back: the bot plays it to the end. A game is closed as `ABANDONED` once every person at the table is away. Bots are ignored, and one person still playing keeps the game open.

- **The count lives in the game state.** Each seat carries `missedTurns`; a timed-out turn adds one and a played turn clears it. Games from when a player could come back have a `REJOIN` move in their log; the engine still reads it, so they replay, but it is no longer accepted from a device.
- **A turn skipped for having no legal move does not count.** It is logged as `TIMEOUT_SKIP` with `stuck: true`, which only the server can set.
- **Only a turn nobody showed up for counts as missed.** A player whose time runs out with something picked was there: the skip is logged with `present: true`, which only that player's own device can set, and is not counted. Nor is a skip that finds a choice still waiting, since the player had already moved.
- **The stand-in bot plays at the game's bot level**, or normal when the game has none.
- **Bot-played turns count in that player's stats.** A win earned by the stand-in bot is recorded as the player's win.
- **Untimed games never close on their own.** The rule counts timed-out turns, and an untimed game has none. An untimed game also cannot move past a player who has walked away.
- **Closed tabs are not detected.** Nothing runs on the server between requests, so a device must be open on the game for a turn to time out. If every player closes their tab, the game stays `ACTIVE` until someone reopens it; the expired turn is then skipped and the rule applies.
- **Abandoned games are not recorded in stats.** Only `FINISHED` games are.
- **Games in progress before this rule lose move playback** if they already had a timed-out turn, since their stored state has no count. They jump straight to the latest board instead.

**Game clock**

- **Checked only when someone moves.** Nothing runs on the server between requests, so a game whose clock has run out carries on until the next move, which is then recorded as the start of the final round.
- **The final round is played out.** The clock takes nobody's turn: whoever is up still plays, and the game ends when the round is complete, so everyone has had the same number of turns.
- **Offered in Play vs Computer only.** Private games have no game clock setting.

**Turn timers**

- **Tokens held when the time runs out are taken.** The pick is played as a normal move, so the turn is not a missed one.
- **Unless they would take the player over 10.** There is no time left to choose what to give back, so the pick is not played: the turn is skipped, the player holds what they held before, and it is not counted as missed. The same goes for running out of time with the give-back popup open.
- **A choice doesn't restart the clock.** A move that leaves tokens to give back, or a Location to choose, hasn't ended the turn, so the clock carries on from where it was. Both popups show the turn's timer, as they cover the player's card.
- **If the time runs out with tokens owed on the server**, as when a device drops out between taking and giving back, the move is undone: what it took goes back. After reserving a card only the S.H.I.E.L.D. token goes back and the card stays reserved, since the card that replaced it on the board has been seen. A Location left unchosen is chosen for the player.
- **Games in progress from before this** lose move playback if they had a turn time out with a choice waiting, as the count of missed turns no longer matches. They jump straight to the latest board instead.
- **Timing out another player waits a few seconds.** A player's own device ends their turn at zero. Other devices wait about 3 seconds longer before doing it for them, so there is a short pause when someone has left.

**Move playback**

- **Changing card data mid-game disables playback for games in progress.** Missed moves are rebuilt by re-dealing from the seed and re-applying the move log. If costs, points or tags in `data/cards.json` change, the rebuild no longer matches the stored state and devices jump straight to the latest board instead. Adding `name` or `image` is safe.

## 11. Risks & notes

- **IP**: Marvel/Splendor are licensed properties — this is a personal/portfolio project; assets are owner-supplied and it should not be marketed commercially.
- **Card data fidelity**: costs are reconstructed (see §1 caveat) until verified against a physical copy.
- **Serverless + Pusher** keeps us fully on Vercel; if latency or presence needs outgrow it, the engine's purity makes a move to PartyKit/DO straightforward.
