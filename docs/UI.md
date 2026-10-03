# Screens and UI

How each screen looks and behaves, and where its code lives. The theme throughout is the box art: the night sky, cosmos blues and gold; [DESIGN.md](DESIGN.md) has the tokens and components to build with. For the rules behind the board see [ARCHITECTURE.md](../ARCHITECTURE.md); for frames, levels and coins see [PROGRESSION.md](PROGRESSION.md).

## The game screen

Built for a landscape phone first: one non-scrolling canvas, 100 spacing steps tall and at most 200 wide, that scales to fit any viewport (`.game-board` in `app/globals.css` redefines Tailwind's spacing/text variables, so every size inside the board scales together). Left column: opponent plaques (avatar, name, Avengers tags, reserved cards, points, bonuses/tokens per color, active-turn ring, turn timer). The player who took the first turn has a small gold token on the corner of their picture, on every plaque including the viewer's; tapping it shows a toast saying they started the game, so the table can tell where the last round ends. Center: three level decks (III/II/I) each with a 4-card face-up row. Right: token stacks with counts, then target points, menu (move log), Location tiles and the Avengers tile. Bottom: the viewer's plaque with the tokens being taken this turn, their tray (`n/10`, bonuses/tokens per color, reserved cards), and End Turn. Upright phones get a rotate-your-device screen. All input is tap/click: tapping a card lifts it over a dimmed board with Recruit/Reserve actions, tapping a token stack stages a token (tap it in the tray to put it back), tapping a deck stages a blind reserve; End Turn submits.

---

## Animations on the board

So nobody has to guess what another player did, the board shows it.

- **An outline on what was picked.** Tokens, a card, a deck or a reserved card another player picks is outlined in gold for a second and a half before it leaves the board. The outline is a line drawn clockwise from the top until it is whole; only then is it taken up, the same way round, until it is gone. A player's own picks are not outlined. A bot's outline comes out of its thinking time, so bots are no slower.
- **Announcements.** Claiming a Location, taking or stealing the Avengers tile, and getting the Time Stone each stop the game for everyone: three seconds for a tile, five for the Time Stone, whose announcement fades away together with its light. A tile is carried from its place on the board to the middle of the screen: it is a copy of the very tile that was on the board, so there is nothing to load and no flash. The Time Stone is shown by the Eye of Agamotto, drawn in aged brass cut with markings, with a casing the shape of an eye and the works of a skeleton clock behind the cage (the markings are strokes, not letters, so no device needs a font for them): a gold sphere splits along a slit and its halves part all the way to show the stone, behind a cage of four rings stacked one on another. Each ring carries one bar and turns about the middle of the Eye, the next the opposite way to the last and none at quite the same pace. They start with their bars crossed over the sphere and come to rest with two along the top of the opening and two along the bottom, like the lids of an eye. The bars' shapes, starting places and order in the stack were measured off frames of the real thing. The green light comes up only as it opens, then spreads from the stone out over the screen and fades. Behind the cage small wheels turn under a brass ring. Nothing in the Eye is blurred or filtered, and nothing is drawn outside its own box: Safari gets both wrong on a piece that is growing. The casing and the rim each have a layer of their own (`will-change-transform`); without one Safari paints them into the layer of the light behind them, and they vanish with it. The "Your turn" banner and the results wait until they are over.
- **Where it lives.** `lib/board-events.ts` works out what a move brought about by comparing the board before and after. `components/game/Announcement.tsx` draws it, and `playSteps` in `GameBoardClient.tsx` plays it. The outline is the `trace` style in `globals.css`.
- **Looking closer.** Tapping the win tile, a Location, the Avengers tile, a player's reserved cards or team, or a card's View glides it from its place on the board to the middle of the screen, and tapping it away fades it (`ZoomedView` in `components/game/Zoomable.tsx`). It shares its glide with the announcements (`components/game/glide.ts`).
- **To look at them without playing**, open `/preview/board`. Adding `?show=TimeStone&at=300` to the address plays one and stops it that many milliseconds in.
- **The preview pages** are the board (`/preview/board`), its loading screen (`/preview/loading`), the end of a game (`/preview/game-over`) and the tiers (`/preview/tiers`: every frame tier with what earns it, the rank badge and the leaderboard rows). Each has a bar along the bottom (`app/preview/PreviewBar.tsx`): back to the main menu, the four pages to move between, and a `?` that lists everything a page takes in its address, each value a link that goes there. The board takes `?players=2`, `3` or `4` for how many are at the table, three when left out, and `?first=` for the seat wearing the first player's token. Buttons on its bar go round the table sizes and hand the token to the next seat. The list in the help is checked against what the pages take, so neither drifts from the other.
- **The glide is taken back when it is set up twice.** In development every effect is run twice; the second start used to measure the tile mid-flight and leave it standing in the middle of the screen.
- **Turn clocks.** A turn's clock starts once the animations before it are over, as it already did for a bot's thinking time. The player who moved skips the outline of their own pick, so their device is a second and a half ahead of the others'. That is inside the three seconds a device waits before timing another player out.
- **Less motion.** For anyone who has asked their device for less motion, the outline and announcements appear without moving.

## Loading the board

While a game loads, the board is drawn in outline on the night sky: the player cards, each with the tab for its name, the three decks and their cards, the token piles, the tiles, the trays and End Turn, each in its own place and shape (`components/game/BoardSkeleton.tsx`). They pulse gently, and stay still for anyone who has asked their device for less motion. It shows two other players, as the number at the table isn't known until the game has loaded. To look at it, open `/preview/loading`.

## The end of a game

The popup at the end of a game shows how the whole table finished, with the viewer's row in gold (`components/game/GameOverDialog.tsx`). A win is gold: the Avengers badge in turning rays, with the stones raining down. A loss is red: Thanos, looming. The title lands with a bounce and the rows arrive one at a time. "View board" closes it to look over the final board, where a "Results" button brings it back. The standings list is shared with the profile's Game Record (`components/game/Standings.tsx`). All of the movement is left out for anyone who has asked their device for less motion. To look at it without playing a game, open `/preview/game-over`: it plays the screen with a made-up table, for a win, a loss or a shared win, with two to four players.

## Chat and emoji reactions

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

## Cheat mode

For testing: it outlines the cards the player can afford. It is on when the board's address has `?cheat=true`. Typing `+cheat` after a room's code when joining, or on its own in the room code box when creating a room, turns it on; the lobby carries it on to the board. It only changes what that one player is shown.

## Corners: cards are not tiles

Character cards and tiles have different corners, as on the real pieces, and must never be given the same ones. This keeps getting missed when a piece is drawn somewhere new, so check it on every new place a card or tile appears: the board, the previews, the collection, the home screen art, the end-of-game showcases, the loading skeleton and the admin page.

| Piece | Shape | Corners | Where it is set |
|---|---|---|---|
| Location tiles and the Avengers Assemble tile, wherever they are drawn, at any size | Square (`aspect-square`) | `rounded-tile`: 12% of the tile, so the corner scales with it | `@utility rounded-tile` in `app/globals.css` |
| Character cards on the board, in the trays and in a reserve | Taller than wide (`aspect-card`, 1 : 1.411) | `rounded-md`: a fixed 8px, which fits a card about 64px wide | Tailwind |
| Character cards drawn large: tapped on the board, in a reserve, the team row, the collection's big view | Taller than wide | `rounded-[10%/7.1%]`: 10% of the width by 7.1% of the height, which is the same corner once the card is bigger | Tailwind arbitrary value |
| A card in a tier frame at board size (the collection grid, the tiers preview) | Taller than wide | `rounded-frame`: the card's `rounded-md` corner plus the frame's width, so the two run concentric | `@utility rounded-frame` in `app/globals.css` |
| A card in a tier frame drawn large (the level-up showcase) | Taller than wide | `rounded-frame-lg`: the large card's corner plus the frame's width | `@utility rounded-frame-lg` in `app/globals.css` |

Rules of thumb:

- **A square piece with a picture of a place or the Avengers badge is a tile:** `rounded-tile`. Never `rounded-md`, `rounded-lg` or `rounded-xl`, which would stop scaling with the tile.
- **A tall piece with a character on it is a card:** `rounded-md` small, `rounded-[10%/7.1%]` large. Never `rounded-tile`, which would give it a tile's wide corners.
- **A frame goes outside the piece, so its corner is the piece's corner plus the frame's width.** Use `rounded-frame` or `rounded-frame-lg`; never reuse the piece's own class on the frame, or the two corners stop running concentric.
- **The win tile, Location tiles and the Avengers tile in the home screen's drifting art** are tiles too, and use `rounded-tile`.

## Menu screens: one layout

Every menu screen is laid out the same way, so they keep the same margins and the same top bar.

- **The top bar** (`components/TopBar.tsx`) shows the player's profile button (their picture with a gem of their level's tier on its corner, their name, rating, level and progress to the next level), their wins, their coins, the game's name in the middle, and a menu button on the right. The menu opens a popup with Profile settings and Log out, and Admin for an admin. It is on the home screen, the profile, Profile settings, VS Computer, Private Game and the lobby. It is not on the board, the collection, the admin pages or the previews, and a visitor who isn't signed in doesn't see it.
- **A page adds it** by putting `<TopBar />` beside its screen. It fetches the player itself.
- **`StageRows`** leaves room for the bar and sets the margins: 4 steps at the sides and 3 at the bottom. The last thing in it is the footer; everything before it is the content, which sits in the middle of the room between the bar and the footer, with as much space over it as under. Screens have no header or title of their own.
- **The sizes** come from a canvas 100 steps tall and 200 wide that scales to the screen. The bar takes 17 of the 100, a footer about 13, leaving about 64 for a screen's content.

## Profile

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

- Profile picture: upload one, or choose one from a library of pictures. Done. An uploaded picture first opens in a round frame to drag into place and zoom with a slider; the square in view is kept, drawn at 512px as a JPEG, so a large photo is also made small enough to send (`components/profile/CropPicture.tsx`, with the arithmetic in `crop.ts`). A crop button on the corner of the picture reopens the frame on the pending upload's original, or on the saved upload, which `/api/avatar/current` serves from the app's own address so the browser may redraw it; library pictures have no crop.
- Edit username. Done. Usernames are 3 to 20 characters: lowercase letters, numbers, `-` and `_`. The page looks the name up as it is typed and says whether it is free; the database's unique rule on `username` still has the last word when saving.
- **Scaling the username check (future).** Today each check is one lookup on the unique index, which is quick at this size. If sign-ups ever grow to where those lookups load the database, keep the taken usernames in a fast in-memory set in front of it: a Bloom filter or a Redis set. A name the set has never seen is free without asking the database; only a possible match is looked up. The unique rule stays as the last word either way.
- One Save button keeps the picture and the username together. Leaving with unsaved changes asks first. The browser's own back button is not caught. The Profile page links to it with "Edit profile"; it has no link back to the profile.
- Edit name. Done. A name is optional, up to 40 characters; the profile shows it with the username beneath.
- An admin sees the Edit button on every profile and can change that player's picture, name, username and frames from `/settings?user=<username>`; the server checks the admin list on every save and upload (`lib/edit-target.ts`).
- Profile and Settings pages in the box-art theme. Done. The profile is a gold-framed player card beside the stats, which are split over three tabs: Statistics, Records, and Heroes & Villains.
- Game Record. Done: a fourth tab lists the player's finished games, latest first, with their place, the number of players, rounds, final score and cards by level. Tapping a game shows how the whole table finished, under Victory or Defeat. It is read from the saved games (`lib/game-record.ts`), so clearing games clears it.
- Level, coins, rank and card levels. Designed in [PROGRESSION.md](PROGRESSION.md). All four are done: rank (badge), account level (the player-card frame), card levels (the frame on each recruited card in the Collection) and coins (a balance in the top bar). The shop that spends coins is still to come.

What they rest on:

- **Hero or villain per card.** Done: every card in `data/cards.json` has `side`: `"hero"`, `"villain"`, or `"both"` for one that could go either way. A `"both"` card counts once as a hero and once as a villain. A new card must be given one.
- **New stat columns.** Not needed today. The stats read every finished game the player was in, and clearing games (`pnpm games:clear`) clears them. `pnpm games:reset` clears the games and sets the seven older stats back to zero as well, so every stat starts again together. If either ever matters, keep running totals on `UserStats` instead.
- **Past games.** Done: covered by reading finished games.
- **A name and an email on the user.** `name String?` and `email String?` are in `prisma/schema.prisma`; `pnpm db:update` adds them to the database. The email is copied from the sign-in, and updated if it changes there. It is not unique, as one person can sign in more than one way, and it is never shown on a profile.
- **A picture library.** Done, with no schema change: the pictures are listed in `lib/avatars.ts`, and a chosen one is saved in `avatarKey` as `library/<id>`. They ship with the app, in `public/assets/pfp`; Cloudflare is only for pictures players upload. To add one, put a square picture in that folder and give it a line in the list. Uploaded pictures are saved under `avatars/`, so the two can't be confused.

### The squad in the Game Record

Opening a game in the profile's Game Record shows the team the player recruited in it, under how the table finished, strongest first, in a row that drifts sideways for ever. It is an ordinary scrolling row that is moved along a little at a time, so it can be swiped either way as well; it waits while it is touched and for a moment after. Tapping a card shows it large (`components/profile/TeamMarquee.tsx`). The gallery above is the same teams on a page of their own.

### The collection

A page of every card in the game: the ones the player has recruited at least once are shown, and the rest are empty spaces with dotted outlines and a question mark. Three ways to look at it: one big grid; by level; or by group. By level and by group are laid out like a chart, with the level or group named down the side and its cards, found and not yet found, in a row beside it. What each player has found is kept in its own table, `CollectedCard`, so it outlasts the games: a card counts when the player recruited it themselves in a game played to the end. Abandoned games don't count, nor does anything the stand-in bot recruited. The table is added by `prisma/sql/2026-09-29-collected-cards.sql` and filled from past games by `pnpm collection:backfill`; `lib/collection.ts` reads the cards from a game's moves. When a game is played to the end its cards are saved then and there (`lib/save-collection.ts`, called from the moves route); a game ended by a forfeit counts, as it is finished, not abandoned. The backfill sets each count afresh from the games, so it also puts right anything that failed to save. The page is `/profile/<username>/collection`, under the profile it belongs to, and shows that player's cards to anyone signed in. It is reached from the Collection button on any profile (`components/profile/CollectionScreen.tsx`). The cards are given the whole screen: the page has no logo or footer, the way back sits in the header, each row is filled from edge to edge, and the list runs off the bottom of the screen, fading only at the top. It has four views: one grid, by level, by group and by alliance (hero, villain or either side). The groups are the teams each card is marked with in `data/cards.json`, four at most: a team with three or more cards gets a row, and the rest go under Others. So marking new cards with a new team, such as X-Men, makes its row once it has three. A card in two teams is in both rows. A card sold in a pack (`data/packs.json`) the player doesn't own is shown greyed and blurred under a lock, with its count; tapping it opens a popup that says only that it is locked and which pack holds it, with a button to the shop. The page loads the profile owner's packs, so a visitor sees what that player has unlocked.

## The shop

Reached from the round Shop button at the bottom left of the home screen, at `/shop` (`components/shop/ShopScreen.tsx`). It is laid out on the menu canvas under the top bar: the shelves down the left (card packs, backgrounds, music, Locations, themes) with Back beneath them, what is on the chosen shelf in the middle as tiles with a cover, a title and a price, and the chosen item on the right with its cover, description and one gold Buy button. Nothing is chosen on arrival. A pack says how many cards it holds but not which; that stays a surprise. Owned items carry a green check and their button reads Owned; a player short of coins sees the button disabled. Only card packs are stocked; the other shelves show one dashed Coming soon tile, and `lib/shop.ts` says where their items go. A cover whose picture isn't in the repo yet gets a stand-in, told apart by the image versions list.

Buying goes through `purchaseAction` (`app/shop/actions.ts`), and the top bar's coins follow. A bought pack then opens (`components/shop/PackOpening.tsx`): the pack sits in rotating rays until tapped, its cards are dealt face down in a row and wiggle gently, and each turns over with a tap, flaring gold with the flip sound, or all at once with Reveal all; Done comes once they are all shown, and a shown card opens large. With less motion it opens already dealt and turned over. `/preview/pack` plays it without buying.

## iPhone launch image

An installed iPhone app shows a launch picture every time it opens: Thanos over the game's name on the night sky, with the stones adrift all round.

- **One picture per screen.** An iPhone only uses a picture made for its exact screen, so there is one per screen size, each way up. The screens are listed in `data/launch-screens.json` and the pictures are in `public/launch`.
- **The art is for a phone on its side.** The picture for a phone held upright is the same one turned a quarter, so it reads as "turn me". It reads the right way up once the phone is turned to the left.
- **The pictures are photographs of a page.** `/launch-art` draws the art (`components/LaunchArt.tsx`), and `pnpm launch:images` photographs it at every screen size. Run it, with the dev server running, after changing the art or adding a screen. It needs Google Chrome and a Mac.
- **Held a little longer.** iPhones take the launch picture down as soon as the app is ready, which cannot be changed. So the app holds the same art over itself for about two seconds as it opens, then fades it. This is in the installed app only, and plays again after signing in, since that reloads the app. Held upright, the art is turned a quarter to match the launch picture, and it covers the turn-your-phone notice until it fades: the sideways art already says to turn the phone.
- **The name is in a shipped font.** "Splendor" is set in Gelasio, which comes with the app, so it looks the same on every device and in the launch pictures.
- **Not covered:** iPads open on a plain dark screen. A phone that already has the app installed must remove and re-add it to pick up new pictures.

## Turn-your-phone notice

Every screen is laid out for landscape, so a phone held upright is shown a notice over everything: Thanos over the game's name and "Rotate your device to play", with the stones spread from top to bottom (`RotateNotice` in `components/LaunchArt.tsx`).

- **It runs on past the bottom edge** by the height of the status bar. An installed iPhone app measures the screen that much short when upright, which left a black bar along the bottom. The page behind is the night sky's darkest blue for the same reason.
- **Its pictures wait until it is shown.** It is drawn on every page, so its art is only fetched once the notice is on screen.

## Admin page and user metrics

For the owner to review who is using the game and how much.

- **Visits. Done.** Every signed-in request notes that the user is active (`lib/record-visit.ts`, called from `getOrCreateUser`). A visit is one stretch of activity from one IP address: a request within 30 minutes of the last carries the visit on, and a longer gap or a new address starts another. Each `UserVisit` row holds the user, IP address, browser, when it started and when the user was last active. `pnpm db:update` adds the table; until then nothing is recorded and nothing breaks.
- **What is worked out from them.** Times joined is the number of visits, last joined is the latest, and time in the app is the length of every visit added up. Time spent playing comes from the saved games, so it needs nothing new.
- **Written at most once a minute per user**, after the response has gone out, so it never slows a page or a move. A failure to record is logged and never fails the request.
- **Switching network mid-visit counts as a new visit**, since the address changes.
- **A closed tab is not detected.** A visit ends at the user's last request, so a visit of a single request has no length.
- **IP addresses are personal data.** They are only ever shown on the admin page. A country or city can be worked out from them later, so neither is stored.
- **Coins and purchases.** Every user's coin balance and purchase count are in the Every user table, with what they bought on hover; the Shop tab totals purchases, coins spent, buyers and coins held, over a list of every purchase.
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
