# Marvel Splendor

[![Marvel Splendor: Thanos over the game's name, with the Infinity Stones adrift around him](public/launch/2796x1290.jpg)](https://marvel-splendor.vercel.app)

**[Play it at marvel-splendor.vercel.app](https://marvel-splendor.vercel.app)**

A web version of the board game **Splendor: Marvel Edition**. Recruit heroes, gather the Infinity Stones, assemble the Avengers and claim the Gauntlet. Play against the computer, or open a private room and share the code with friends.

It is built for a phone held on its side, and can be added to the home screen to run like an app.

> This is a personal project. Marvel and Splendor are licensed properties; the art is supplied by the owner and the project is not for commercial use.

## What it does

- **Play vs Computer:** 2 to 4 players, with easy, normal or hard bots.
- **Private games:** create a room, share a six-letter code, and play live.
- **Timers:** an optional turn timer and game clock.
- **Away players:** a bot takes over for anyone who misses 3 turns in a row, until they come back.
- **Profiles:** a picture, name and username, with stats and a record of every finished game.
- **Progression:** XP and level frames, coins with a daily bonus, a rank and leaderboard, and a collection with card levels.
- **Installed app:** home screen icon, launch picture, and full-screen play on iPhone.

## Built with

| Part | Tool |
|---|---|
| App | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui |
| Database | Postgres on Neon, through Prisma |
| Sign-in | Auth0 |
| Live play | Pusher Channels |
| Profile pictures | Cloudflare R2 |
| Tests | Vitest |
| Hosting | Vercel |

> **This Next.js has breaking changes** from earlier versions. Read the guides in `node_modules/next/dist/docs/` before writing code against it. See [AGENTS.md](AGENTS.md).

## Getting started

You need Node 22 and pnpm.

1. **Install:**

   ```bash
   pnpm install
   ```

2. **Set up the environment.** Copy `.env.example` to `.env` and fill it in. Each value says where to find it.

   | Group | Needed for |
   |---|---|
   | `DATABASE_URL` | Everything |
   | `AUTH0_*`, `APP_BASE_URL` | Signing in |
   | `PUSHER_*`, `NEXT_PUBLIC_PUSHER_*` | Private games |
   | `R2_*` | Uploading a profile picture |
   | `OPENAI_API_KEY` | Bot banter (not built yet) |

3. **Set up the database:**

   ```bash
   pnpm db:update
   ```

4. **Run it:**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000). To try a private game on your own, sign in as two different players in two browsers.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Runs the app for development |
| `pnpm build` | Builds the app for production |
| `pnpm start` | Runs the production build |
| `pnpm lint` | Checks the code style |
| `npx vitest run` | Runs the tests |
| `npx tsc --noEmit` | Checks the types |
| `pnpm db:update` | Applies `prisma/schema.prisma` to the database and rebuilds the database client |
| `pnpm images` | Refreshes the picture fingerprints. Runs by itself before `dev` and `build` |
| `pnpm launch:images` | Retakes the iPhone launch pictures. Needs the dev server running, Google Chrome and a Mac |
| `pnpm collection:backfill` | Shows what each player's collection would hold, from the games played to the end. Add `--yes` to save it |
| `pnpm rating:backfill` | Shows what each player's rank would be, rating every multiplayer game played to the end in order. Add `--verbose` to see each game and every player's swing, `--yes` to save it |
| `pnpm coins:backfill` | Shows what each player's coins would be, paying out every game played to the end in order. Add `--verbose` to see each payout, `--yes` to save it |
| `pnpm rewards:backfill` | Shows what each finished game gave each player, replaying rank, coins and XP in order. Add `--verbose` to see every game, `--yes` to save it |
| `pnpm daily:backfill` | Shows the daily bonus each player would be given for every day since they joined, through yesterday. Add `--yes` to save it |
| `pnpm xp:lab` | Builds `docs/xp-lab.html`, a page to try XP weights and level curves against every finished game |
| `pnpm games:clear` | Shows what clearing every game would delete. Add `--yes` to delete; this cannot be undone |
| `pnpm games:reset` | A fresh start: the same, and every player's stats set back to zero. Players, names and pictures are kept. Add `--yes` to do it |

## How the project is laid out

| Folder | What is in it |
|---|---|
| `app/` | Pages and API routes |
| `components/` | The board (`game/`), menus (`home/`, `lobby/`), and profiles (`profile/`) |
| `lib/engine/` | The rules of the game. Pure functions, no database or network |
| `lib/bot/` | How the computer chooses its moves |
| `lib/` | Everything else: live play, game history, stats, sign-in, storage |
| `data/` | Cards, locations, art paths and launch screen sizes |
| `prisma/` | The database schema |
| `public/` | Card art, game art, icons and launch pictures |
| `scripts/` | The tools behind the commands above |
| `tests/` | Rule tests, on a frozen copy of the card data |
| `auth0/` | The themed login page, to paste into the Auth0 dashboard |

## Changing the game's data

- **Cards:** `data/cards.json`. Each card needs an `id`, `name`, `side` (`hero`, `villain` or `both`), `groups` (its teams, four at most, or `[]`), `level`, `bonus`, `points`, `cost` and `tags`. `image` is optional. Saved games refer to cards by `id`, so never reuse or renumber one.
- **Locations:** `data/locations.json`.
- **Board art:** `data/assets.json`. Set a value to a path under `public/`, or leave it `null` to keep the drawn placeholder.
- **Launch screens:** `data/launch-screens.json`. After adding one, run `pnpm launch:images`.

Changing a card's cost, points or tags while games are in progress stops those games from replaying missed moves. Adding a `name` or `image` is safe.

## Deploying

The app is hosted on Vercel.

1. Set every value from `.env.example` in the Vercel project, with `APP_BASE_URL` as the live address.
2. Apply the schema to the production database with `pnpm db:update`.
3. Paste `auth0/login.html` into the Auth0 Universal Login template, and add the live address to the allowed callback and logout URLs.

## Releasing

Every release has a number, `MAJOR.MINOR.PATCH`, and an entry in `data/updates.json`, latest first. The menu's What's new button shows them (`components/UpdateLog.tsx`), one box to a release, closed until tapped. A gold dot sits on the menu button and on What's new when there are releases the player hasn't seen; opening the log clears it, and shows those releases open, in gold, marked New. The last release seen is remembered on the device, not the account, so a new phone shows the dot once.

| What the release holds | What changes | Example |
|---|---|---|
| Something new for players | MINOR goes up, PATCH back to 0 | 0.8.0 to 0.9.0 |
| Only fixes or small changes | PATCH goes up | 0.9.0 to 0.9.1 |
| The first release of the next version of the [roadmap](docs/ROADMAP.md) | MAJOR goes up, the rest back to 0 | 2.5.0 to 3.0.0 |

- One release is one branch's work, however many pull requests it took to merge; `pulls` lists them.
- Each entry has a date, a short title, one sentence that sums it up, and no more than about seven changes under `new`, `improved` and `fixed`, in words a player would use.
- Leave out what players can't see: admin pages, previews, tests, scripts and notes.
- With each release, add the entry and set `version` in `package.json` to match.

## More detail

| Doc | What it holds |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | The rules the engine implements, the stack, how a move travels, the data model, routes, and the limits of the timers and idle rules |
| [docs/UI.md](docs/UI.md) | How each screen looks and behaves |
| [docs/DESIGN.md](docs/DESIGN.md) | The design system: colours, type, layout, components, motion, sound |
| [docs/PROGRESSION.md](docs/PROGRESSION.md) | XP and levels, coins and the daily bonus, rank, card levels |
| [docs/ROADMAP.md](docs/ROADMAP.md) | What has shipped and what is still to build |
