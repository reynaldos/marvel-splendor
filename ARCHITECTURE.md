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

**Corners**

Tiles and cards have different corners, as on the real game, and should not be given the same ones.

| Piece | Shape | Corners |
|---|---|---|
| Location tiles, Avengers Assemble tile | Square | `rounded-tile` (12% of the tile), everywhere they are drawn |
| Character cards on the board | Taller than wide | `rounded-md` |
| Character cards opened large | Taller than wide | `rounded-[10%/7.1%]` |

**Images (done)**

Pictures are resized and served as AVIF or WebP, and cached for a month. Each picture's address carries a fingerprint of its contents from `data/image-versions.json`, so replacing a picture gives it a new address and players fetch the new one. `pnpm dev` and `pnpm build` refresh the fingerprints; `pnpm images` does it by hand.

**Phase 4 — stats and profiles**

Player stats, shown on the profile page. Done: they are worked out from how each of the player's finished games ended (`lib/career-stats.ts`, loaded by `lib/load-game-history.ts`), so they cover games already played and need no new columns.

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
- **New stat columns.** Not needed today. The stats read every finished game the player was in, and clearing games (`pnpm games:clear`) clears them. If either ever matters, keep running totals on `UserStats` instead.
- **Past games.** Done: covered by reading finished games.
- **A name and an email on the user.** `name String?` and `email String?` are in `prisma/schema.prisma`; `pnpm db:update` adds them to the database. The email is copied from the sign-in, and updated if it changes there. It is not unique, as one person can sign in more than one way, and it is never shown on a profile.
- **A picture library.** Done, with no schema change: the pictures are listed in `lib/avatars.ts`, and a chosen one is saved in `avatarKey` as `library/<id>`. Uploaded pictures are saved under `avatars/`, so the two can't be confused.

## 9. Testing & correctness strategy

- Engine: property-style tests (token conservation invariants — supply + hands + spent always equals initial counts), scenario tests for every rulebook clause, full bot-vs-bot fuzz games from random seeds asserting no illegal state.
- API: integration tests for move validation, concurrency (stale `version` rejected), redaction (a client can never see deck order or hidden reserves).
- E2E happy paths (Playwright, later): create → join → play → finish.

## 10. Known limitations — turn timers and idle games

How the timing rules behave today, including the cases they do not cover. The rules live in `lib/game-replay.ts` (`turnEndsInMs`, `isTableIdle`) and the engine (`isAway`) and are applied in `app/api/games/[id]/moves/route.ts`.

**Idle games**

A player who misses three turns in a row is marked away, and a bot plays their seat from then on. They see a notice with an "I'm back" button, which hands the seat back at any time. A game is closed as `ABANDONED` once every person at the table is away. Bots are ignored, and one person still playing keeps the game open.

- **The count lives in the game state.** Each seat carries `missedTurns`; a timed-out turn adds one and a played turn clears it. Coming back is logged as a `REJOIN` move.
- **A turn skipped for having no legal move does not count.** It is logged as `TIMEOUT_SKIP` with `stuck: true`, which only the server can set.
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

- **The clock restarts on a sub-move.** A turn is timed from the game row's last write (`Game.updatedAt`), so returning tokens or choosing a Location gives that turn a fresh clock.
- **Timing out another player waits a few seconds.** A player's own device ends their turn at zero. Other devices wait about 3 seconds longer before doing it for them, so there is a short pause when someone has left.

**Move playback**

- **Changing card data mid-game disables playback for games in progress.** Missed moves are rebuilt by re-dealing from the seed and re-applying the move log. If costs, points or tags in `data/cards.json` change, the rebuild no longer matches the stored state and devices jump straight to the latest board instead. Adding `name` or `image` is safe.

## 11. Risks & notes

- **IP**: Marvel/Splendor are licensed properties — this is a personal/portfolio project; assets are owner-supplied and it should not be marketed commercially.
- **Card data fidelity**: costs are reconstructed (see §1 caveat) until verified against a physical copy.
- **Serverless + Pusher** keeps us fully on Vercel; if latency or presence needs outgrow it, the engine's purity makes a move to PartyKit/DO straightforward.
