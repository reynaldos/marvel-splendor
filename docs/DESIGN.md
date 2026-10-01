# Design system

What every screen is built from, so a new one looks like it belongs. The look is the game's box: a night sky in cosmos blues, gold for anything that matters, and Marvel red only where something is dangerous. Built for a phone held on its side, tap and click only, no drag. Everything here is already in the code; the class strings are copied from it, so copy them again rather than inventing near-misses.

The art is fixed: card faces, tiles, stones, pictures and the launch art are supplied by the owner and are never edited, recoloured or regenerated.

## Colour

Defined in `@theme` in `app/globals.css`. Use these names; never a raw hex or a Tailwind blue, yellow or red.

| Token | Hex | Use |
|---|---|---|
| `cosmos-950` | `#070b2a` | The ground. Also the inside of inputs, value pills and unlit tiles |
| `cosmos-900` | `#0d1445` | Popover and dialog backgrounds, the dark end of gradients |
| `cosmos-800` | `#172066` | Cards and raised surfaces inside a dialog |
| `cosmos-700` | `#24308f` | Pills, round buttons, secondary buttons; a lit tile. Hover goes up to `cosmos-500` |
| `cosmos-500` | `#4d5fd6` | Rings and borders on every control (`ring-2 ring-cosmos-500 ring-inset`), dividers (`border-cosmos-500`), hover fill |
| `cosmos-300` | `#a9b4ff` | Muted text: notes, captions, locked icons |
| `gold-400` | `#f6c945` | Headings, labels, icons, the primary button, the focus ring, the new-dot |
| `gold-200` | `#fff0a8` | Icons on dark pills, the bright end of gold gradients, primary button hover |
| `gold-600` | `#b57f14` | The dark end of gold gradients and glows |
| `marvel` | `#ed1d24` | Destructive actions only: delete, forfeit. Hover `red-500`. Also the red block in the logo |
| white | | Body text. `text-white/70` for a dialog's description, `text-white/80` for a note on a dark overlay |

The background is `bg-cosmos`, the star field, on `body` and on `Stage`, so nothing ever flashes black between pages. Translucent darkening over art is `bg-cosmos-950/75` or `bg-black/45`, not grey.

Semantic colours stand apart from the palette: green `up`-style text for a rise, `#ff6b6b` (`--destructive` in the dialog theme) for a fall or an error, and the tier colours of the frames (`lib/frame-tier.ts`). Frame tiers are the only place other hues appear.

shadcn/ui components read their tokens from `.theme-cosmos` with `dark`, which remaps primary to gold, secondary and muted to the cosmos blues, and the ring to gold. Put both classes on any `DialogContent` or shadcn surface.

## Type

Three faces, loaded in `app/layout.tsx`:

| Role | Face | Class | How it is set |
|---|---|---|---|
| Display: headings, labels, buttons, numbers that matter | Orbitron | `font-display` | Always uppercase, black weight, letter-spaced: `font-display font-black tracking-widest uppercase`. Buttons use `tracking-wide` |
| Body | Geist | default | Bold for anything the eye should land on, `font-bold`; normal for descriptions |
| The game's name | Gelasio | `font-logo` | Only in the logo and launch art. `text-gold` is the gradient lettering of the title; use it for nothing else |

Recipes used everywhere:

- **Dialog or section title:** `font-display text-base font-black tracking-widest text-gold-400 uppercase`
- **Small heading over a group:** `font-display text-xs font-black tracking-widest text-gold-400 uppercase`
- **Note or caption:** `fs-2xs font-bold text-cosmos-300 tabular-nums`
- **Description under a title:** `text-sm text-white/70`

Inside a `Stage` or the board, every text size scales with the canvas (below), and two extra sizes exist for the tiniest labels: `fs-2xs` (2.5 steps) and `fs-3xs` (2 steps). Any number that changes gets `tabular-nums` so it doesn't jiggle.

## Layout

Every screen is one landscape canvas, 100 spacing steps tall and at most 200 wide, that scales to the viewport: `.stage` and `.game-board` in `app/globals.css` redefine `--spacing` and the text sizes, so each `h-`, `w-`, `p-`, `gap-` and text utility inside scales together. On a 390px-tall phone a step is about 4px, Tailwind's default. Safe areas are handled there too, with the notch side getting the full inset and the other side a fraction (`data-notch`).

- **Menu screens** sit in `<Stage>` and lay out in `<StageRows>` (`components/Stage.tsx`): the top bar takes the first 17 steps, the footer is the last child, and the content floats level between them. Margins are 4 steps at the sides and 3 at the bottom. Screens have no header or title of their own; the top bar is the header. Add `<TopBar />` beside the screen.
- **The board** is `.game-board`, laid out in `components/game/Board.tsx`; [UI.md](UI.md) describes what goes where.
- **Nothing scrolls the page.** A list that can outgrow its room scrolls inside its own box.
- **Phones held upright** get the rotate notice over everything; design for landscape only.
- **Groups use `flex` or `grid` with `gap`**, never margins between siblings.

## Components

The building blocks, with the class strings as they appear in the code. Heights are 12 steps for a top-bar pill or a wide button, 11 for a value pill or toggle, 10 for a small round button.

| Block | Recipe | Seen in |
|---|---|---|
| Pill (a figure with an icon) | `flex h-12 items-center gap-2 rounded-full bg-cosmos-700 px-4 ring-2 ring-cosmos-500 ring-inset`; tappable adds `hover:bg-cosmos-500` | `TopBarView` |
| Round icon button | `flex size-12 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500` (`size-10` for a small one) | `TopBarView`, `ShareCode` |
| Menu choice (icon over a word) | `group flex w-20 flex-col items-center gap-1.5 text-xs font-bold tracking-wide uppercase` with a `size-14` round icon in `bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset group-hover:bg-cosmos-500` | `TopBarView` menu |
| Wide button | `flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-base font-bold outline-none focus-visible:ring-2 focus-visible:ring-gold-400`, then one of: secondary `bg-cosmos-700 ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500`; primary `bg-gold-400 text-cosmos-950 hover:bg-gold-200`; destructive `bg-marvel text-white hover:bg-red-500` | `TopBarView`, `FeedbackForm` |
| Board button | `h-12 rounded-full px-4 font-display text-sm font-black tracking-wide uppercase shadow-lg`, gold when live, `disabled:bg-cosmos-700 disabled:text-cosmos-300` | `EndTurnBar`, `GameOverDialog` |
| Small action pill (inside a tile) | `h-7 rounded-full bg-gold-400 px-3 text-xs font-black text-cosmos-950 uppercase hover:bg-gold-200` | `DailyBonus` |
| Option (a setting you tap to cycle) | gold display label over `h-11 w-full max-w-36 rounded-full bg-cosmos-950 text-xl font-black ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-700` | `components/lobby/Option.tsx` |
| Toggle | `flex h-11 items-center justify-between gap-3 rounded-full bg-cosmos-950 pr-2 pl-5 text-base font-bold ring-2 ring-cosmos-500 ring-inset` | `components/Toggle.tsx` |
| Panel | `rounded-2xl bg-cosmos-950/80 ring-3 ring-cosmos-500 ring-inset` | profile stats |
| Grid tile | `relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl ring-2 ring-inset`, unlit `bg-cosmos-950 ring-cosmos-500`, lit `bg-cosmos-700 ring-gold-400 shadow-[0_0_16px] shadow-gold-400/40`; an overlay over it is `absolute inset-0 … bg-cosmos-950/75` | `DailyBonus` |
| Mode tile (the big home buttons) | `rounded-3xl bg-linear-to-b p-3 shadow-xl ring-2 ring-white/20 hover:-translate-y-1`, with the art above and a label band `rounded-full bg-black/45 font-display font-black uppercase ring-2 ring-white/30` | `components/home/ModeTile.tsx` |
| Progress bar | track `h-2 rounded-full bg-cosmos-950 ring-1 ring-cosmos-500 ring-inset`, fill `rounded-full bg-linear-to-r from-gold-600 to-gold-200` | `TopBarView` |
| New dot | `size-3 rounded-full bg-gold-400 ring-2 ring-cosmos-950`, absolute on a button's top right | `UpdateLog` |
| Divider | `<hr className="border-cosmos-500" />` | dialogs |
| Player picture | `<PlayerAvatar>`: a circle, the picture or initials, in a `ring-2 ring-cosmos-500` ring or the player's tier frame | everywhere a player is named |
| Tier frame | `frame-gold` with `style={FRAME_STYLE[tier]}` and `FRAME_EFFECT[tier]`; the count in a `gem-badge` | profile, collection, top bar |

### Dialogs

One `<Dialog>` per screen, switching views inside it, because two dialogs over each other left stale pointer locks on touch. Content is `<DialogContent className="theme-cosmos dark border-2 border-gold-400 gap-4 sm:max-w-md">`, `sm:max-w-lg` for a grid or a long list, with `flex max-h-[90dvh] flex-col` when the body scrolls. Title in the display recipe; a `DialogDescription` always, `sr-only` when there is nothing to say, so the dialog stays accessible. Choices go in a row of menu choices; actions in a row of wide buttons with the destructive one last.

### Cards and tiles

Character cards are `aspect-card` (1 : 1.411) and tiles are `aspect-square`. Their corners differ and must not be mixed; the table in [UI.md](UI.md#corners-cards-are-not-tiles) has every class and where it is set.

## Motion

Motion shows what happened; it never decorates. Everything that moves has a still version: wrap keyframes and `animation` in `@media (prefers-reduced-motion: no-preference)` in `app/globals.css` (the existing blocks show the pattern) or use `motion-safe:`, and let the end state show at once otherwise. In React, read `matchMedia("(prefers-reduced-motion: reduce)")` and skip to the end.

Timings in use, to match rather than invent: a pop or land 0.7s with a slight overshoot (`result-pop`), a glide across the board 900ms, a gold flare 0.9s, a chat bubble or announcement held 3s, the Time Stone 5s, a count-up 1.6s with ease-out. Hover on a tile lifts it 1 step; nothing else moves on hover.

## Sound

`playSfx(name)` from `components/audio.tsx` with a name from `lib/audio-tracks.ts`: `tap`, `flip`, `recruit`, `clock-low`. Play it from the tap, not after the server replies. It respects the player's Sounds switch, and phones only play after the first tap, so never rely on a sound to carry meaning.

## Focus and accessibility

- Keyboard focus is a gold ring: `outline-none focus-visible:ring-2 focus-visible:ring-gold-400` (`ring-4` on a big tile). Never the browser outline, never no focus state.
- Every icon-only button has an `aria-label`; a tile that changes state says so (`aria-expanded`, `aria-selected`).
- Text over art sits on a darkened band, never directly on a picture.
- Long-press and text selection are off inside the canvas (`user-select: none`), except in inputs.

## Words

Player-facing text is short and plain: "Collect", "Sign out", "Your turn". Display labels are uppercase by class, so write them in sentence case in the code. Numbers get a unit or an icon, never both. No exclamation marks outside the results screen. Name things by what the player sees, not how the code works: "coins", not "balance"; "picture", not "avatar".

## Starting a new screen

1. `<Stage>` with `<StageRows>` and `<TopBar />`, or a view inside the top bar's dialog if it is small.
2. Headings in the display recipe, gold; body in Geist, white; notes in `cosmos-300`.
3. Controls from the table above, rings in `cosmos-500`, the one primary action in gold, anything destructive in `marvel`.
4. Cards and tiles with their own corners.
5. Motion with a reduced-motion fallback; sound on the tap.
6. Add it to `/preview` if it is hard to reach by playing, so it can be looked at without a game.
