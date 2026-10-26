# Marvel Splendor — Architecture

A web implementation of **Splendor: Marvel Edition** (Space Cowboys / Marc André). Play vs. a computer opponent or host a live game session friends join with a share code. Signed-in users get a persistent profile with stats and an avatar. Games are configurable (turn timer, game clock, target points) and include in-game chat and emoji reactions.

**Product inspiration:** [Ephod](https://the-ephod.com/) (iOS/Android) — a Splendor-mechanism mobile game with real-time multiplayer, private games, and rankings. The approved game-screen layout reference is an Ephod screenshot.

This document covers the rules the engine implements, the stack, how a move travels, the data model, routes, and the known limits of the timing rules. The rest lives beside it:

| Doc | What it holds |
|---|---|
| [README.md](README.md) | Getting started, commands, deploying, releasing |
| [docs/UI.md](docs/UI.md) | How each screen looks and behaves: the board and its animations, chat, menus, profile, admin, launch pictures |
| [docs/DESIGN.md](docs/DESIGN.md) | The design system every screen is built from: colours, type, layout, components, motion, sound |
| [docs/PROGRESSION.md](docs/PROGRESSION.md) | XP and levels, coins and the daily bonus, rank, card levels |
| [docs/ROADMAP.md](docs/ROADMAP.md) | What has shipped and what is still to build |
| [docs/DUEL.md](docs/DUEL.md) | Duel, the two-player game: its rules, its board, and how it shares the server with the Marvel game |

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
| Location tiles (nobles) | 4 base + packs | Random `playerCount` tiles used per game, from the base tiles and any Location pack at the table; 3 pts each |
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
The engine is data-driven: it makes no assumption about deck sizes. Cards, Locations, and per-player-count token supplies are all loaded from `data/` — adding, removing, or rebalancing cards is a JSON change (plus an asset image keyed by card id), never a code change. Game state and the move log reference cards by stable id, so expansions are backward-compatible with saved games and replays as long as existing ids are never reused or mutated. A game is dealt from the base cards plus the card packs in `settings.packs` (`cardPool` in `lib/engine/data.ts`), and its Location tiles from the base tiles plus the Location packs there (`locationPool`): every pack anyone at the table owns, resolved when the game is created and frozen with its settings, so a replay re-deals the same pool however ownership changes later.

---

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

### Duel (`lib/duel/`, `lib/bot/duel-policy.ts`)
A second game, Splendor Duel for two, with its own pure engine in the same shape (`types`, `setup`, `validate`, `legal-moves`, `apply`, `view`) and a one-ply bot. `lib/game-rules.ts` is the one surface over both engines: `settings.rules` (`"marvel"` or `"duel"`) picks the game, and the server loop, the routes, replay, playback and the records call `createAny`, `validateAny`, `applyAny`, `legalAny`, `chooseBotAny` and `redactAny` instead of either engine directly. The play page picks `DuelBoardClient` or `GameBoardClient` by the same setting. The rules, the board design and the plan are in [docs/DUEL.md](docs/DUEL.md).

---

### The bots' three levels

Measured by playing them against each other, each deal twice with the seats swapped.

| Level | How it chooses | Against the level below |
|---|---|---|
| Easy | The move that leaves the board looking best, ignoring the dearest cards | |
| Normal | The same, looking one move further (it was "hard" before) | Wins about 85% |
| Hard | Plans three of its own turns ahead, following the five most promising lines, and judges each by how close it is to winning (`lib/bot/planner.ts`). Takes the card an opponent would win with | Wins about 9 in 10 |

- **Hard wins in about 27 rounds**, where the old hard took 33.
- **It costs nothing to run** and uses no outside service. A move takes about a tenth of a second on the server.
- **No randomness.** The same board always gives the same move.
- **To measure a change**, keep a copy of the bot as it was and play the two against each other over many deals, counting wins and rounds.
- **A language model was weighed and turned down** for choosing moves: it is slower, costs money on every move, and plays a game of counting worse than a search does. It suits bot banter, which is on the list below.

---

## 4. Data model

The schema is `prisma/schema.prisma`; this is what each table is for. Columns added after the first schema were applied with the SQL files in `prisma/sql/`.

| Model | Holds |
|---|---|
| `User` | The Auth0-linked profile: username, optional name, email as last seen at sign-in, picture key, and the two level-frame switches |
| `UserStats` | Running totals from finished games: played, wins, vs-bot wins, best points, fastest win, Avengers tiles, Locations |
| `UserRating` | The ELO-style rank and how many rated games fed it |
| `UserCoins` | The cached coin balance; `CoinTransaction` is the source of truth |
| `CoinTransaction` | The coin ledger: one row per award, with a `reason` (`game:<tier>:<win|loss>`, `daily:<day>`) and the game when there is one |
| `CollectedCard` | How many times a player has recruited each card, in games played to the end |
| `Purchase` | What a player has bought in the shop: the kind of thing, its id, the price paid and when; one of each per player |
| `UserVisit` | One row per stretch of activity, with IP address, browser and times, for the admin page |
| `Feedback` | Feature requests and bug reports from the menu, with a status the admins move along |
| `Game` | A table: status, mode, seed, frozen settings, the current state snapshot, a `version` for optimistic concurrency, and the winning seat |
| `GamePlayer` | A seat: the user or guest or bot in it, and `rewards`, what the game gave them when it finished (`GameRewards` in `lib/game-record.ts`) |
| `Move` | The move log, one row per move in order |
| `ChatMessage` | Every emoji and message sent at a table |

The `Move` log + `seed` makes every game replayable/auditable; `state` is a materialized snapshot so reads are cheap. Only `FINISHED` games count for stats, rank, coins, XP and the collection; `ABANDONED` ones count for nothing.

### GameSettings (chosen by the host at creation, editable in lobby, frozen at start)

```ts
interface GameSettings {
  turnTimeSeconds: number | null;   // null = untimed turns
  gameTimeMinutes: number | null;   // null = no game clock
  targetPoints: number;             // default 16 (rulebook); host may raise/lower
  botDifficulty?: "easy" | "normal" | "hard";
  botDifficultyBySeat?: Partial<Record<number, "easy" | "normal" | "hard">>;  // overrides botDifficulty for one seat
  startedAt?: number;               // when play began, in ms; the game clock runs from here
}
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
- **Turn timer enforcement (serverless-safe)** → turn ends are worked out from the last move's time (`lib/game-replay.ts`). The active player's device submits a `TIMEOUT_SKIP` move at zero; every other device does the same about three seconds later as a backstop, and the server checks the clock before accepting it. Three consecutive missed turns marks the seat away and a bot takes it over. The game clock runs from `settings.startedAt` and is checked on every move. Section 10 has the cases these rules do and don't cover.
- **Timeouts/abandonment** → a stale `ACTIVE` game past a TTL can be marked `ABANDONED` (checked lazily on access — no cron needed for v1).

vs-Bot games skip Pusher entirely: the move POST response contains the bot's reply move(s) and new view.

---

---

## 6. App structure & routes

```
app/
  page.tsx                          # main menu: Play Game / Duel
  private/                          # create or join a private room
  join/[code]/                      # join by code (sign in or guest name)
  lobby/[gameId]/                   # pre-game lobby
  play/[gameId]/                    # the board (both modes)
  profile/[username]/               # public profile, stats, game record; /collection under it
  settings/                         # own profile edit, avatar, level-frame switches
  leaderboard/                      # top 100 by rating
  admin/users/                      # owner's dashboard: users, tables, messages, feedback
  preview/{board,loading,game-over,tiers}/   # screens to look at without playing
  launch-art/                       # the page the iPhone launch pictures are photographed from
  daily-bonus/actions.ts, feedback/actions.ts, settings/actions.ts, lobby/[gameId]/actions.ts, private/actions.ts, admin/actions.ts
  api/
    games/route.ts                  # POST create
    games/[id]/route.ts             # GET view (redacted for the viewer)
    games/[id]/moves/route.ts       # POST move; bots reply in the same request; rewards recorded when the game finishes
    games/[id]/chat/route.ts        # POST emoji or message
    games/[id]/presence/route.ts    # Pusher channel auth
    avatar/upload/route.ts          # presigned R2 PUT + confirm
components/
  game/      the board and everything on it, the end-of-game dialog and rewards
  lobby/     vs-computer setup, private room, lobby
  home/      main menu
  profile/   profile, settings, collection, leaderboard, frames and badges
  admin/     dashboard tables
  ui/        shadcn/ui generated
  TopBar.tsx, TopBarView.tsx, DailyBonus.tsx, FeedbackForm.tsx, UpdateLog.tsx, SoundToggles.tsx, LaunchArt.tsx, Stage.tsx
lib/
  engine/    the rules, pure
  bot/       the computer's play
  record-*.ts   what a finished game writes: stats, rating, coins, rewards, visits, the daily bonus
  load-*.ts     reads for the pages: game history, XP, feedback
  xp.ts, coins.ts, rating.ts, card-level.ts, frame-tier.ts, daily-bonus.ts   the progression rules (docs/PROGRESSION.md)
  game-replay.ts, game-server.ts, game-view.ts, game-record.ts, board-events.ts, pusher.ts, r2.ts, auth0.ts, db.ts
data/        cards.json, locations.json, assets.json, updates.json, launch-screens.json, image-versions.json
docs/        this doc's companions, and xp-lab.html built by `pnpm xp:lab`
prisma/      schema.prisma and the SQL applied since
scripts/     the backfills and tools behind the pnpm commands
tests/       rule tests on a frozen copy of the card data
```

---

## 7. Auth, profiles, storage

- **Auth0**: Universal Login; `auth0Sub → User` upsert on first login with a username-picker step. Session via the Auth0 Next.js SDK.
- **Guests**: no account; identified per-game by `guestToken` cookie; their stats are not recorded. A guest can later sign up, but v1 does not migrate past guest games.
- **Avatars**: client requests a presigned R2 PUT (size/type-limited), uploads directly, confirms; we store the object key and serve via R2 public bucket/custom domain. OpenAI avatar generation is out of scope for v1 (deferred).
- **Stats**: updated transactionally when a game reaches `FINISHED` — games played, wins, best points, fastest win, Avengers tiles won, Locations claimed.

---

---

## 8. Images

Pictures are resized and served as AVIF or WebP, and cached for a month. Each picture's address carries a fingerprint of its contents from `data/image-versions.json`, so replacing a picture gives it a new address and players fetch the new one. `pnpm dev` and `pnpm build` refresh the fingerprints; `pnpm images` does it by hand.

---

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
- **Offered on both setup screens**, Play Game and Duel, and shown in the room. In a Duel the game ends once both players have had the same number of turns: the most points wins, then the most Avengers badges, and level is a draw.

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
