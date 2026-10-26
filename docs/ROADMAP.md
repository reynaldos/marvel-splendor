# Roadmap

What is still to build, and how the project got here. Releases are numbered in `data/updates.json`; the release process is in the [README](../README.md#releasing). Each version of the game is a MAJOR number: 1.0.0 was the playable game once the box-art look was on (the original plan below), 2.0.0 brought rank, levels and coins, 3.0.0 opened with Duel and the foil frames, and the versions below are what comes next.

## Version 2

Still open from version 2; each carries on alongside version 3.

- **Sound effects and background music.** Started: music on the board and its preview, four sounds, and Music and Sounds switches that are remembered on the device. Still to do: sounds for the rest of a game's moments (your turn, the timer running low, winning or losing), music on the menus, and more tracks for the shop.
- **A shop, paid for in coins.** Started: the shop screen, buying through the ledger with a `Purchase` table of what each player owns, and the first shelf, card packs, with the Fantastic Four pack and its opening ([UI.md](UI.md), [PROGRESSION.md](PROGRESSION.md)). Since then: the Locations shelf, with a pack of five tiles dealt in like a card pack. Still to do: the other shelves, board backgrounds, background music tracks and maybe layout themes, each of which needs its items listed in `lib/shop.ts` and a way to choose what is in use, which is a schema change; and more packs as the backlog's art lands.

## Version 3, now

The version we are in. It opened with the two-player game and the foil frames.

- **Duel, Splendor for two.** Started: the engine, the bot, the board, a third home tile and a two-seat room, and the how-to slides ([DUEL.md](DUEL.md)). Still to do: a Duel rating of its own with a Duel tab on the leaderboard, which needs a new table; art for the powers, the Locations and the bag.
- **Style the game menu.** The menu on the board, and its move log, game settings and forfeit popups, have the theme's colours but plain lists and default buttons. Bring them in line with the menus: the gold headings, pill buttons and icon-and-value settings used on the setup pages.
- Bot banter.
- End-to-end tests.
- **Friends.** Add friends by username, see their profiles, and invite them to a game. An invite sends a notification; opening it asks whether to join that game's lobby. Needs new tables for friendships and invites, which is a schema change. Notifications inside the app can use the live connection already there; ones that reach a phone with the app closed need web push, which on an iPhone only works once the app is on the home screen. To decide: whether a friendship needs accepting, and whether profiles stay open to everyone or only to friends.
- **Duos, 2 v 2.** A four-seat game played as two teams, partners sitting opposite so turns alternate between teams. The team's points are added together for the end trigger and the standings, and both partners win or lose together. To decide: whether partners share tokens, bonuses or a reserve, or only their score; whether a team may talk beyond the set messages; how rank is scored for a team result; and whether bots can partner a player. Needs a team on each seat, which is a game setting and a change to how the engine ends a game, not a schema change.
- **Tier frames in a shader.** Shipped: one fragment shader, no three.js, draws the frames as live foil with facets, metal and holographic shine, lit from the finger or from how the phone is held, on the collection, the leaderboard, the profile and every avatar ([SHADER_FRAMES.md](SHADER_FRAMES.md)). Still to do: real refraction on the cards drawn large.

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
