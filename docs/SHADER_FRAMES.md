# Tier frames in a shader (v3)

The plan for the roadmap item "Tier frames in a shader". The frames today are CSS in `lib/frame-tier.ts` and
`app/globals.css`: a faceted border, a sheen, sparkles, shards and a holographic band, all on fixed keyframes.
This doc says what a WebGL pass adds, what it must not break, and the order of work. Tick a step when it ships.

## What we found

**Where frames are drawn.** `frame-gold` + `FRAME_STYLE[tier]` + `FRAME_EFFECT[tier]` in seven places: the
collection grid (115 cards at ~56px), the collection's large card, the level-up flare (`CardLevelUps`), the
profile card, the player avatar (everywhere a player is named), the top bar pill and the rewards gem badge.

**One canvas per card does not work.** Browsers allow about 8 to 16 WebGL contexts per page. Past that, the
oldest context is lost. A grid of 115 framed cards can never each have a canvas. The known fix is one
full-page canvas with a scissor rect per card. That is a lot of code for 56px cards whose effect nobody can
see. So: the shader goes on the cards drawn large. The small frames stay CSS.

**CSS can already follow the finger and the phone.** The Pokémon card demo (simeydotme/pokemon-cards-css)
does the whole "foil that turns" effect in CSS. It writes the pointer or tilt into custom properties
(`--pointer-x`, `--pointer-y`, `--rotate-x`, `--rotate-y`) and the gradients read them. For the gyroscope it
takes `gamma` as x and `beta` as y, relative to the pose on the first reading, clamped to ±16° and ±18°.
At rest it runs a slow sine "showcase" and springs back to centre. Our `frame-shine`, `frame-holo` and
`frame-twinkle` can read two such properties instead of keyframes, and every frame on screen will turn with
the phone, including the grid and the avatars, with no WebGL.

**What only a shader can do.** Refraction: the art bends under the facets, with the colour channels split.
Glints that light up and go out as the view angle changes, instead of fading on a timer. Iridescence: a hue
that depends on the angle between the surface normal and the view, as on a real foil. The proven form is a
procedural normal map (Voronoi cells for gem facets, noise for crushed foil, stripes for prizm lines), a view
vector from the tilt, a specular term, and a cosine palette for the hue shift.

**three.js is not needed.** It costs about 150 KB gzipped and we draw one quad. A raw WebGL2 program of one
fragment shader is about 200 lines and no dependency. If a scene library is ever wanted, `ogl` is 20 KB.

**iPhone gyroscope rules.** `DeviceOrientationEvent.requestPermission()` must be called inside a tap
handler (`click` or `touchend`, not `touchstart`), on HTTPS, in the main thread. Android needs no request.
Reports say the grant does not always persist for home-screen web apps. So the ask goes on a tap the player
already makes, and the pointer is always the fallback.

**Card art as a texture.** Refraction needs the art in the shader. Card art is in `public/cards` on our own
origin, and `/_next/image` is same-origin too, so there is no CORS problem. One `Image` with `crossOrigin =
"anonymous"` set before `src`, then `texImage2D`.

**Screenshots.** Headless Chrome draws WebGL only with `--enable-unsafe-swiftshader` added to the usual flags.
Checked: a red `gl.clear` came out red in the shot.

## Design

```
lib/tilt.ts              one tilt source: pointer over the element, else gyroscope, else idle drift → {x, y} in -1..1
lib/frame-tier.ts        + FOIL[tier]: the shader's per-tier numbers (palette, facet scale, glint density, bend)
components/game/Foil.tsx <canvas> over a large card's face; falls back to nothing, so the CSS frame shows
app/globals.css          frame-shine / frame-holo / frame-twinkle read --tilt-x / --tilt-y when set
app/preview/foil/        the demo: every tier on one canvas, ?tilt=x,y to shoot a state (done)
```

**Tilt.** `useTilt(ref)` returns `{x, y}` and also sets `--tilt-x` / `--tilt-y` on the element. Pointer
over the element wins. Else the gyroscope, relative to the pose when the view opened, clamped to ±16° / ±18°.
Else a slow sine drift, as the keyframes do today. `prefers-reduced-motion: reduce` gives a fixed centre.
Springs ease every change so a jump of the finger does not jump the light.

**Canvas.** Absolutely positioned over the face, `inset: 0`, the face's `border-radius`, `pointer-events:
none`. One WebGL2 context, one full quad, uniforms: `uTilt`, `uTime`, `uSize`, `uArt` and the tier's `FOIL`
numbers. Draw only while tilt or time moves and the page is visible; cap device pixels at 2; stop on
`webglcontextlost` and remove the canvas, so the CSS frame is what is left. The CSS frame always renders
underneath; when the canvas is live, the frame's `::before` and `::after` are turned off with one attribute.

**Shader, by layer.**
1. Rounded-rect SDF for the face and the border ring.
2. Normal: a brilliant cut for Diamond to Ruby; crushed foil noise plus prizm stripes for
   Prismatic and Mastered.
3. View vector `normalize(vec3(tilt, 1))`, a light mirrored from it, specular `pow(dot(R, V), n)`.
4. Hue: `t = dot(N, V) * k + noise`, cosine palette tinted per tier (Prismatic the full rainbow, Diamond
   white to cyan, Mastered gold to violet, Emerald and Ruby one hue).
5. Refraction: sample the art at `uv + N.xy * bend`, R, G and B at slightly different offsets. `bend` is 0
   below Diamond.
6. Glints: a hash grid of points; `pow(cos(hash + dot(V, dir) * f), 40)` so each lights up and goes out with
   the angle.
7. The border: the conic facets turn with the tilt so the light runs round the frame.

**Where it shows.** The collection's large card, the level-up flare and the profile card. Later, if wanted,
the player avatar on the profile. Never the grid, the top bar or the badge.

**Settings.** No schema change. A "Motion frames" switch kept on the device, like Music and Sounds. Off
means no gyroscope ask and the plain drift.

## Steps

Each step is one issue: build, a `tsx` or headless-Chrome check, then stop for review.

- [x] **0. Demo.** `/preview/foil`: every tier on one canvas, one card each, the shader in `app/preview/foil/FoilDemo.tsx`
      with the per-tier numbers in its `FOIL` table. The light follows the pointer over the grid, the phone after
      "Tilt with phone", and drifts on its own otherwise; `?tilt=x,y` holds it still for a shot. Nothing outside
      the preview page changed. What moves to `lib/` and `components/` is decided after the demo is judged.
- [x] **1 and 2. The layer, in the collection and on the player's picture.** `components/Foil.tsx`:
      `FoilLayer` draws every `data-foil` slot in its parent on one canvas, each over its own `<img>` (the
      texture is the picture already loaded, so nothing more is fetched). The card opened large from the
      collection has a layer; the grid has one pinned over it, drawing only the border and glow of each card
      (`data-foil-plain`) unless `GRID_FOIL` in `CollectionScreen.tsx` is on, as a hundred faces redrawn every
      frame dragged on a phone. The leaderboard pictures are plain the same way. Every player picture with a tier is a
      slot, drawn by one layer per screen: the profile card, the settings picture, the top bar and the
      leaderboard. Uploaded pictures are served through the image resizer (`remotePatterns` in `next.config.ts`,
      from `R2_PUBLIC_BASE_URL`) so they are this site's own and can be textures; only initials get the
      border, the glow and the light laid over them. The frame is always on in the top bar, on the leaderboard (at a
      card's full light) and on other players' profiles; the two switches in Settings, Effects and Border, set what players see
      on their own profile and in settings: the full frame, the border and glow alone (`data-foil-plain`, as the
      collection grid), the face's light in a plain ring (`data-foil-bare`), or nothing. The CSS frame stays
      under each slot as the fallback and is quietened while the shader is live (`[data-foil-live]` in
      `app/globals.css`). The tier numbers are `FRAME_FOIL` in `lib/frame-tier.ts`. The gyroscope in the app: a
      "Tilt with the phone" switch under Level frame in Settings, kept on the device; with it on, the layer takes
      the tilt at once on Android and from the player's next tap on an iPhone, where the ask is allowed. Not yet:
      the pointer drives the CSS frames too.
- [ ] **3. The gem tiers.** The metals and the stones in the same shader. Check: shots per
      tier.
- [ ] **4. Level-up and profile.** The flare in `CardLevelUps` and the profile card. Check: the preview
      game-over level-up state.
- [ ] **5. Polish.** Reduced motion, hidden page, context loss, the "Motion frames" switch, a real iPhone
      test of the permission ask in Safari and from the home screen.
- [ ] **6. Docs.** `DESIGN.md` frame row, `UI.md`, `ROADMAP.md`, the 3.0.0 entry in `data/updates.json`.

## Risks

- The gyroscope grant on an iPhone home-screen app may not persist. The pointer and the drift must always be
  enough on their own.
- A canvas over the face hides the CSS sheen, so the two must look like one family. Build the shader from the
  same tier colours.
- The level-up end state shows every card that went up at once. Cap the live canvases at a few and leave the
  rest on CSS.
