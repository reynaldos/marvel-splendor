# Duel: the two-player game (plan)

The plan for a Splendor Duel mode, from the official rules (SPACE Cowboys, 2022). Tick a step when it ships.

## The rules, in short

Two players. Each turn you may first do one or both of two free things, then you must do one of three things.

**Free, in this order**
- Spend a Privilege: hand one back and take any one token from the board (not Gold).
- Refill the board: empty the bag onto the empty spaces along the spiral. Your opponent gets a Privilege for it.

**Then one of**
- Take up to 3 tokens from the board that sit in a straight line, touching, with no gap: a row, a column or a diagonal. Not Gold. Taking 3 of one color, or 2 Pearls, hands your opponent a Privilege.
- Take 1 Gold token and reserve a card from the pyramid or the top of a deck. At most 3 reserved, hidden from the opponent.
- Buy a card from the pyramid or your reserve. Pay its cost with tokens, less one per matching bonus you own. Gold is wild. Spent tokens go in the bag.

**A bought card gives**
- Points, a bonus color (some give two), and sometimes a Crown.
- An ability, done at once: another turn; copy a color you already own; take a token of the card's color from the board; take a Privilege; take a token from the opponent.

**Crowns.** Your 3rd Crown and your 6th each give you one of four Royal cards, with points and an ability.

**End of turn.** More than 10 tokens, give some back to the bag. Then, if you have any one of these, you win at once:
- 20 points, or
- 10 Crowns, or
- 10 points on cards of one color.

If none of the three actions is possible, you must refill the board first.

## From the rules video (Watch It Played)

Details the rulebook states less plainly, kept here so the engine gets them right:

- Reserved cards count for nothing: not toward any win, and no penalty either.
- A copy-color card joins a column of one color and stays there for the rest of the game. More than one may join
  the same column. With no colored card to join, it cannot be bought.
- Spent tokens go into the bag, so the bag refills as cards are bought, and the refill action puts them back on the
  board from the middle out.
- A Privilege owed with none on the table is taken from the opponent; a player holding all three gets nothing more.
- You may spend any number of Privileges at once, one token each, never Gold.
- The board prints three reminders above the spaces: two Pearls, a refill, or three of one color hand the opponent
  a Privilege. The scrolls sit beside the board; the Royal cards below it.
- Gold comes only with a reserve; with no Gold on the board the reserve action is not allowed.
- The hand limit of ten is checked at the end of the turn, so a turn may go over it in the middle.

## Marvel-ified

How the pieces read in this game's theme, with no new rules:

| Duel piece | Here |
|---|---|
| The five gems | the five stones, as on the Marvel board |
| Pearls | the Time stone: two in the bag, no card gives a bonus of it |
| Gold | the S.H.I.E.L.D. token |
| Crowns | the Avengers mark already printed on the cards |
| Jewel cards | the box's 67 cards from `data/duel/cards.json`, each drawn over a Marvel picture of its level and color: the band of its color covers the printed one and carries the points, the marks and the ability; its costs cover the printed ones at the bottom left. Pearls are in the costs, as the Time stone |
| Wild cards | the nine many-gem cards wear the grey band; bought, one joins a color you own and counts as it from then on. Three cards have no bonus at all and a dark band |
| Privilege scrolls | "Favours", a scroll token until there is art |
| Royal cards | four leaders, each with points and an ability: the "3 and 6 Avengers marks" rewards |
| The bag | the Vault |
| Refill the board | "Call for reinforcements" |
| The three wins | 20 points, 10 Avengers marks, or 10 points on cards of one stone |

**The table, locked in.** The preview at `/preview/duel` is the design to build:
- Left column: the rival's plaque with their Avengers and scroll counts on its name tab; under it the four Royal
  cards two by two (Location tiles with a panel over the printed strip: points, mark, power); under those the three
  Privilege scrolls, a taken one dim with its holder's name.
- Middle: the pyramid, 3, 4, 5, each row beside its deck. A card is the box's Duel card drawn over a Marvel picture:
  the band of its color over the printed one with the points in Orbitron, the Avengers marks, the power badge, a
  second stone for a double bonus; the grey many-gem band for wild cards, the plain grey band for the three with no
  bonus; the costs in a column over the printed ones, always as tall as the printed list. The picture is chosen to
  match: same level and color, marks only when the card has crowns, no more printed costs than the card has.
- Right column: the win tile (the gauntlet, with 20 pts, 10 marks, and 10 in a color as five dots on a pentagon over
  its printed strip) above the 5 by 5 token board. Empty spaces show the printed spiral through them, the middle one
  tinted. The board is a button: tapping it opens it large with the three reminders stacked beside it, which is
  where a line is picked. The bag count sits on its corner.
- The tray as the Marvel board has it, a little shorter: your plaque with what the staged line takes, your tokens and
  bonuses, your reserved cards, End turn.
- Icons until there is art: Repeat for another turn, Grape for the wild bonus, Copy for a token of this color,
  ScrollText for a Privilege, HandCoins for taking from the opponent, PaperBag for the bag, Equal for the
  three-of-a-color reminder.

## Game plan

The engine first, then the board that talks to it, then the way in. Each step is one issue with its check.

### 1. Engine (`lib/duel/`)

Pure, seeded, no database, like `lib/engine/`. The types to settle before anything else:

- `DuelState`: `players[2]`, `board: (TokenColor | null)[25]` in spiral order, `bag: TokenColor[]` (its order
  hidden from the view), `decks` by level, `pyramid` by level, `royals` left, `privileges` on the table (0 to 3),
  `currentSeat`, `extraTurn` (the again power), `pending` for the choices below, `status`, `winnerSeat`.
- `DuelPlayer`: `tokens` (the six colors), `cards` (bought ids, with the color each wild card joined), `reserved`
  (ids, hidden from the opponent), `privileges`, `royals`.
- `DuelMove`: `SPEND_PRIVILEGE { space }`, `REFILL`, `TAKE_LINE { spaces: 1..3 }`, `RESERVE { from: pyramid | deck,
  cardId? , level }`, `BUY { cardId, joinColor? }`, and the answers to pending choices: `PICK_TOKEN { space }`
  (the take-a-token power), `PICK_OPPONENT_TOKEN { color }`, `RETURN_TOKENS { tokens }` (over ten), `PICK_ROYAL
  { id }`. The timeout and forfeit moves as the Marvel engine has them.
- The turn: free moves first, any number of `SPEND_PRIVILEGE` and at most one `REFILL`, then exactly one of the three
  mandatory moves, then powers resolve, Royals are checked, the hand limit, then the win check. `apply` says whose
  turn is next; `extraTurn` keeps it.
- Rules to get right, from the rulebook and the video: lines are straight and unbroken, no Gold in a line; three of
  a color or two Pearls hand the opponent a Privilege; a Privilege owed with none on the table comes from the
  opponent, none if they have all three; reserve needs Gold on the board and under three reserved; buy pays with
  tokens less bonuses, Gold wild, spent tokens to the bag; a wild card needs a colored card to join and stays there;
  take-a-token of a color with none left does nothing; Royals at 3 and 6 marks, taken at once; over ten tokens at
  the end of the turn goes back to the bag; any of the three wins ends the game at once; no mandatory move possible
  means a forced refill.
- Check: `tests/duel/` per rule, from the rulebook's examples, like `tests/engine/`. A bot-vs-bot run that games
  finish and each win is reached sometimes comes with step 2.

### 2. Bot (`lib/bot/duel-policy.ts`)

Score every legal move by the state it leaves, as `policy.ts` does: points, marks toward 3 and 6, the best color run
toward 10, bonuses, Privileges held, and denying the opponent a line of three. Resolve pending choices the same way.
Legal moves in Duel are few, so a flat one-ply score is enough to start.

### 3. Server

`rules: "duel"` in the game's settings JSON (absent means Marvel). The move schema grows the Duel moves. The move
route, the game GET, replay and the redacted view branch on `rules` to pick the engine and hide reserved cards and the
bag's order. The server loop takes either bot policy. Timers as now; an extra turn does not restart the clock.

### 4. Board (`components/duel/`)

The preview made real: `Board.tsx` reads a `DuelView`, stages a move (tap tokens for a line, a card to buy or
reserve, a scroll to spend, the bag to refill) and confirms it, as the Marvel board does with `staged-action.ts`.
The popups: pick a token (powers and Privileges), pick an opponent's token, return tokens, pick a Royal, pick the
color a wild card joins. Reused as is: `Card`, `PlayerPlaque`, `TurnTimer`, `GameClock`, `MoveLog`, `Zoomable`,
`Announcement`, chat, the menu, `EndTurnBar`. The preview page keeps `?show=` states for the popups.

### 5. The way in

- Home: a third `ModeTile`, "Duel", beside VS Computer and Private Game, with its own art (the token board or the
  gauntlet) and tone. It goes to `/duel`, a setup screen like Solo's with the choice of a bot or a friend.
- Against a bot: `SoloGameScreen`'s picks without player count, plus the bot level and the timers; creates a VS_BOT
  game with `rules: "duel"`.
- With a friend: `PrivateGameScreen` with `rules: "duel"` carried into the lobby; a Duel lobby seats two and its
  Start waits for exactly two. The join code, the away timer and rejoin carry over unchanged.
- The game page picks the board by the game's rules. Stats count games and wins as now; Avengers tiles and Locations
  stay zero for Duel.

### 6. Polish and docs

Traces for an opponent's line and buy, announcements for Royals and the win, the move log's wording, how-to slides
for Duel, sounds, `ARCHITECTURE.md`, `ROADMAP.md`, the changelog entry.

## What we found

**It is a different game, not a mode.** The cards, the tokens, the board, the extras and the ending all differ from the
Marvel game. The Marvel engine's types (`Card` with one bonus and no ability, `TokenCounts` without Pearls, a
token bank of piles, Locations and the Avengers tile) do not fit, and bending them would break both games. Duel gets
its own engine under `lib/duel/`, built the same way as `lib/engine/` (pure, seeded, no database), and its own
board. What it shares is everything round the game: accounts, the lobby, the game row, the move route, the server
loop, chat, timers, stats and rewards, and the card, plaque, timer, log and popup components.

**Pieces that are new**

| Piece | Duel | Marvel today |
|---|---|---|
| Cards | 67 in 3 levels (30, 24, 13): cost, points, 0 to 2 bonuses, 0 to 2 Crowns, one ability on some | 1 bonus, points, Avengers tags |
| Tokens | 25: 4 of each of 5 colors, 2 Pearls, 3 Gold | piles per color, Time, S.H.I.E.L.D. |
| Where tokens sit | a 5 by 5 grid filled along a printed spiral; you take a straight line of up to 3 | a bank: take 3 colors or 2 of one |
| The market | a pyramid: 3, 4 and 5 cards face up | 4 per level |
| Extras | 3 Privileges, 4 Royal cards, a bag | Locations, the Avengers tile |
| Win | at once, on 20 points, 10 Crowns, or 10 points in one color | 16 points and all five bonuses, end of round |
| Players | exactly 2 | 2 to 4 |

**The board must change.** The Marvel board is a token bank beside three market rows. Duel is a 5 by 5 token grid
with a line to pick, a pyramid, two Privilege slots, four Royal cards, a bag count and a crown count per player. That
is a new `components/duel/Board.tsx`, not a mode on the old one. Reused as they are: `Card`, `PlayerPlaque`,
`TurnTimer`, `GameClock`, `MoveLog`, `Zoomable`, `Announcement`, chat, the menu, the end-turn bar's shape, the staged
action pattern (tap to stage, confirm to send), and the trace that outlines what an opponent picked.

**No schema change.** The game row's `mode` stays VS_BOT or MULTIPLAYER. Which rules a game plays is a field in its
settings JSON, `rules: "marvel" | "duel"`, read by the move route to pick the engine and by the game page to pick the
board. Old games have no field and are Marvel.

**Theme.** Decided: the Marvel cards as printed, see Marvel-ified above. For the record, the three ways weighed:
- Plain: jewels and pearls, placeholder card faces drawn by `Card` as today for cards without art. Fastest.
- Marvel skin: the five stones for the five gems, a sixth stone for Pearls, Royal cards as four leaders, character
  art on the 67 cards. Each card needs its own picture, as the Marvel game's did.
- Marvel skin from the existing art: reuse the 115 Marvel pictures on the 67 Duel cards by matching color and level.
  No new art, the collection stays one set, but the same character appears in both games with different costs.
The engine does not care. The cards' printed points, Avengers marks and bonus are right for Duel as they are; only the
ability badge is added, from a small data file of which cards carry which.

**Card data.** Done: the 67 cards and the 4 Royal cards are in `data/duel/cards.json` and `data/duel/royals.json`,
transcribed from an open-source recreation of the game (Balthazar Jarry-Wilson's, GPL; the numbers are the game's,
the code was not used). `tests/duel-data.test.ts` pins the totals: 67, 30/24/13, nine many-gem cards, three with no
bonus, five with a double bonus, Pearls in 29 costs, 8 the top cost. The colors map blue=space, white=mind,
green=soul, black=power, red=reality, Pearl=time.

**Why the Duel costs and not the printed ones.** Twenty-nine of the 67 cards cost a Pearl, and no Marvel card prints
a Time stone cost, so playing Duel on the printed costs would drop the Pearl from the game. The costs come from the
data and are drawn over the art, as the band is.

**The bot.** `lib/bot/policy.ts` scores Marvel moves by simulating them. Duel gets a sibling with the same shape:
score every legal move by the state it leaves. The scoring is new (points, crowns, color runs, privileges, denying
the opponent a line), and a simple one is enough to start, since legal moves in Duel are few and the game is short.

**The lobby.** The private game screen as it is, with a "Duel" choice beside the point target, and when it is chosen
the table is capped at two: one other player by code, or one bot. The solo screen gets the same choice. Nothing else
in the lobby changes; the join code, the away timer, the start all carry over.

**Stats and rewards.** Games played and wins count as now. Duel has no Avengers tiles or Locations, so those stats
stay at zero for Duel games. Rating is per game mode today, so Duel can share it or have its own column; sharing is
the smaller change and fine to start. The card collection is Marvel's; Duel cards join it only with the Marvel skin.

## Steps

- [x] **0. Card data.** `data/duel/cards.json`, `data/duel/royals.json` and `tests/duel-data.test.ts`.
- [x] **Board design.** `/preview/duel`, locked in above.
- [ ] **1. Engine.** As in the game plan. First issue: `types.ts`, `setup.ts` and `board.ts` (the spiral, lines on
      the grid), with tests for the deal and for which lines are legal.
- [ ] **2. Bot.**
- [ ] **3. Server.**
- [ ] **4. Board.**
- [ ] **5. The way in.** Home tile, Duel setup screen, the two-seat lobby.
- [ ] **6. Polish and docs.**
- [ ] **7. Art.** The five power icons, the scroll, four Royal pictures, a bag.

## Risks

- The card data: 67 cards by hand is where a wrong cost hides for weeks. The totals check catches most of it, a
  second pass against the box catches the rest.
- Extra turns and "take from your opponent" touch the turn loop and the clock, which assume one move ends a turn.
  The engine must say whose turn comes next, and the route must trust it.
- The grid line pick on a phone: three tokens in a diagonal at board size is a small target. Stage by tapping the
  first and last token, with the line filled in.
