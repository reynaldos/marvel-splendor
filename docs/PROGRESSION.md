# XP and coins

How a finished game pays out. Rank (the ELO-style rating) is separate and lives in `lib/rating.ts`; it is not covered here.

Everything below is awarded on the server when a game reaches FINISHED, from the moves route (`app/api/games/[id]/moves/route.ts`). Bots and guests earn nothing. Abandoned games pay nothing.

## XP

XP only ever goes up. It drives the account level, which drives the player-card frame and the frame on the player's picture. It never affects rank or gameplay.

### What a game is worth

Code: `GAME_XP`, `placeXp` and `gameXp` in `lib/xp.ts`; the seat is read in `gameXpByUser` in `lib/record-rewards.ts`.

| Factor | XP |
|---|---|
| Playing the game to the end | 5 |
| Place | see the table below |
| Each opponent at the table | human 4 · hard bot 3 · normal bot 2 · easy bot 1 |
| Each Infinity Point past the game's target (16 unless the lobby changed it) | 3 |
| Each card recruited | 1 |
| Each Avengers badge on your cards | 1 |
| Holding the Avengers Assemble tile at the end | 5 |
| Each Location claimed | 3 |
| Holding the Time Stone at the end | 2 |

A guest, or a stand-in bot playing for someone who left, counts as a human opponent.

### Place

Place is worth 20 / 10 / 5 / 2 for 1st / 2nd / 3rd / 4th at a full table of four. Every shared winner is 1st. Each empty seat takes 5 off every place, and nothing goes under 3.

| Table | 1st | 2nd | 3rd | 4th |
|---|---|---|---|---|
| 4 players | 20 | 10 | 5 | 3 |
| 3 players | 15 | 5 | 3 | |
| 2 players | 10 | 3 | | |

When every opponent is a bot, the place XP is multiplied by the average of the bots' factors: hard 0.8, normal 0.6, easy 0.4. Then the floor of 3 applies again.

| Bot-only table | 1st |
|---|---|
| Three hard bots | 16 |
| Three normal bots | 12 |
| Three easy bots | 8 |
| One hard bot | 8 |
| One normal bot | 6 |
| One easy bot | 4 |

One human at the table means no bot scaling.

### Card levels

Code: `CARD_LEVEL_XP` and `cardLevelXp` in `lib/xp.ts`; the ladders in `lib/card-level.ts`.

Each card a player has recruited in finished games has a level from how many times they have recruited it. Every level a card climbs pays XP: 5 for the first, one more for each after.

| Climb | Recruited → Bronze | Bronze → Silver | Silver → Gold | Gold → Platinum | Platinum → Emerald | Emerald → Ruby | Ruby → Diamond | Diamond → Prismatic | Prismatic → Mastered |
|---|---|---|---|---|---|---|---|---|---|
| XP | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 |

A Mastered card has paid 81 in total. The ladder depends on the card's level, because level 1 cards are recruited about four times as often as level 3 cards:

| Tier | Recruited | Bronze | Silver | Gold | Platinum | Emerald | Ruby | Diamond | Prismatic | Mastered |
|---|---|---|---|---|---|---|---|---|---|---|
| Level 1 card, times recruited | 1 | 8 | 15 | 30 | 45 | 68 | 98 | 135 | 180 | 240 |
| Level 2 card | 1 | 5 | 10 | 20 | 30 | 45 | 65 | 90 | 120 | 160 |
| Level 3 card | 1 | 3 | 5 | 10 | 15 | 23 | 33 | 45 | 60 | 80 |

Card frames are cosmetic only. They never change a card's cost, points or bonus.

### Worked example

1st of three against a human and a hard bot, 18 points with a target of 16, 12 cards, 3 badges and the Avengers tile, 1 Location, the Time Stone, and one card reaching Bronze:

| | XP |
|---|---|
| Played | 5 |
| 1st of three | 15 |
| Opponents: human 4 + hard bot 3 | 7 |
| 2 points past target × 3 | 6 |
| 12 cards | 12 |
| 3 badges | 3 |
| Avengers tile | 5 |
| 1 Location | 3 |
| Time Stone | 2 |
| Card to Bronze | 5 |
| **Total** | **63** |

### Levels

Code: `scoreForLevel`, `accountLevel` and `ACCOUNT_FRAME_TIER_MIN_LEVEL` in `lib/xp.ts`.

The XP needed for a level is `150 × (level − 1) ^ 1.7`, rounded. It keeps climbing past 10 and is never capped.

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 13 | 16 | 20 | 25 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| XP needed | 0 | 150 | 487 | 971 | 1583 | 2314 | 3155 | 4100 | 5145 | 6285 | 10312 | 15048 | 22216 | 33300 |

The level sets the player-card frame tier:

| Frame tier | Recruited | Bronze | Silver | Gold | Platinum | Emerald | Ruby | Diamond | Prismatic | Mastered |
|---|---|---|---|---|---|---|---|---|---|---|
| Account level | 1 | 2–3 | 4–5 | 6–7 | 8–9 | 10–12 | 13–15 | 16–19 | 20–24 | 25+ |

### Where XP lives

There is no XP column. Each finished game's XP is saved in that seat's `GamePlayer.rewards` as `xp: { before, after }`, alongside coins, rating and card level-ups (`GameRewards` in `lib/game-record.ts`). A player's total is the sum of `after − before` over their seats (`accountXpByUser` in `lib/load-xp.ts`), read by the top bar, profile, settings and leaderboard.

Changing any number above changes XP for new games only. To recount every past game, run the rewards backfill. It replays every finished game in order and rewrites the rewards column, nothing else:

```
pnpm rewards:backfill        # dry run: prints each player's saved → replayed XP
pnpm rewards:backfill --yes  # save it
```

### Trying new numbers

`pnpm xp:lab` builds `docs/xp-lab.html` from the database: every player's finished games with their factors, in a page that recounts totals, levels and frames live as the weights, level curve and tier levels are edited. Open the file in a browser. It opens on the numbers in the code; the "Copy as code" tab gives the block to paste into `lib/xp.ts`.

## Coins

Code: `lib/coins.ts` and `lib/record-coins.ts`. Coins are a currency for the shop to come. They never affect XP, rank or gameplay.

### Payout

A finished game pays by the toughest opponent at the table and whether the player won. Any human opponent makes it a human game.

| Toughest opponent | Win | Loss |
|---|---|---|
| Human | 50 | 20 |
| Hard bot | 30 | 12 |
| Normal bot | 18 | 7 |
| Easy bot | 10 | 4 |

Shared winners all count as winning.

### Guardrails

- **Minimum turns.** A player must have taken at least 4 turns in the game to be paid. A turn is a token take, a reserve, a recruit or a timed-out skip. This blocks an instant-forfeit farm loop.
- **Daily cap on bot games.** Coins from games with no human opponent are capped at 150 per UTC day per player. Human games are not capped, since they need another person.

### Daily bonus

Code: `lib/daily-bonus.ts` for the rules and `lib/record-daily-bonus.ts` for the ledger; the dialog is `components/DailyBonus.tsx`, opened from the coin pill in the top bar, which shows a dot while a claim is waiting.

One claim per UTC day. Claiming on consecutive days climbs the streak; missing a day drops it back to Day 1, and the day after Day 8 starts over at Day 1. Once collected, the next tile counts down to midnight UTC.

| Day | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Coins | 10 | 15 | 20 | 25 | 30 | 40 | 50 | 100 |

A full rotation pays 290. Each claim is a ledger row with reason `daily:<day>`, so the streak is read from the ledger: the latest `daily:` row says when the last claim was and which day it reached. The claim is checked and written inside one transaction, so a double tap pays once. The bot-game daily cap counts only `game:` rows, so the bonus never eats into it, and the coins backfill leaves these rows alone.

### Where coins live

`CoinTransaction` is the ledger and the source of truth: one row per award with `userId`, `delta`, `reason` (`game:<tier>:<win|loss>`), `gameId` and `createdAt`. `UserCoins.balance` is a cached total for fast reads. The daily cap is checked against the ledger's rows for today whose reason is not a human game.

`pnpm coins:backfill` pays every finished game again from zero, in order, with the daily cap applied per day as it was then. It replaces the ledger's game awards and keeps anything else in it.

## What the results screen shows

After the standings land, the viewer's coins count up, the XP bar fills from before to after and flashes a new level when it crosses one, the rating moves in a rated game, and a button opens the cards that went up a tier (`components/game/RewardsPanel.tsx`). All of it is read from the seat's saved rewards, so it shows the same way when the game is opened again later.
