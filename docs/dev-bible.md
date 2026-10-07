# Undersong development bible

This is how Undersong is built. `CLAUDE.md` holds the short rules. This file holds the detail behind them. Values such as costs, palette and formulas live in `canon.md`, not here.

---

## 1. Architecture

### 1.1 The one-way loop

```
input (pointer/keys/UI) ──► actions ──► sim.step(state, action|tick, ctx) ──► new state
                                                                      │
                     render (canvas) ◄── selectors ◄──────────────────┤
                     ui (Preact)     ◄── selectors ◄──────────────────┘
```

- **State** is one serialisable object (`GameState`, in `src/sim/state.ts`). There are no class instances, functions or `Map`s in it, only plain objects, arrays, strings, numbers and `Decimal` (stored in saves as strings).
- **Actions** are plain tagged objects, such as `{ type: 'mineTile', x, y }` or `{ type: 'hireMiner' }`. The UI and input layers create actions and do nothing else.
- **`sim.step`** is the only thing that changes state. It is pure: the same state, action and context always give the same result.
- **Render and UI** read state through selectors (`src/sim/selectors.ts`). They never write to it.

### 1.2 Time

- The simulation ticks at a **fixed 10 Hz** (`TICK_MS = 100`). An accumulator in `src/main.ts` runs whole ticks, at most 50 per frame, with any surplus deferred.
- Rendering runs on `requestAnimationFrame` and interpolates only cosmetic things, such as sprite frames and particles.
- Offline progress uses `sim.catchUp(state, elapsedMs, ctx)`, which runs in closed form or in coarse steps of 1 s, never 10 Hz for hours. It must agree with ticking at 10 Hz to within 2%, and a test checks this.

### 1.3 Context (dependency injection)

`ctx = { rng, now }` is passed into the sim. `rng` is a seeded PRNG (`src/sim/rng.ts`, mulberry32) whose seed is stored in state, so replays are deterministic. Nothing in `src/sim` or `src/world` imports `Math.random` or `Date`. Lint enforces this with `no-restricted-globals` on those folders.

### 1.4 World

- The world is a grid of tiles split into **32×32 chunks**. Tile data is stored per chunk in typed arrays: `Uint8Array` for material, light (×2 channels) and water, and `Uint8Array` for heat.
- Each Cave-in uses a new world seed from `src/world/generator.ts`. Generation is deterministic from `(seed, chunkX, chunkY)` and runs lazily when a chunk is first seen.
- Only **changes** are saved: mined tiles, placed objects and water levels, stored per chunk as a diff from the generated version. Saves stay small.
- **Lighting** uses a breadth-first flood fill per chunk, run only on chunks marked as changed (dirty), plus one neighbouring chunk in each direction. Decay values are in `canon.md`. Never recompute the whole world in one frame.

### 1.5 Rendering

- Canvas 2D. Each chunk is cached to an offscreen canvas and redrawn only when dirty. The light overlay is a second cached layer for each chunk.
- **Integer scaling only.** Scale is ×2, ×3 or ×4, chosen by breakpoint. Set `imageSmoothingEnabled = false` everywhere, and round camera positions to whole screen pixels.
- Sprites come from `public/atlas.png` and `atlas.json`. Never draw art with ad-hoc `fillRect` calls in render code. The exception is particles, which are single pixels in palette colours.

### 1.6 UI

- Preact components sit in a DOM overlay above the canvas. They get state from a `useGame(selector)` hook and dispatch actions.
- Fonts: Silkscreen for numbers and HUD labels, and Pixelify Sans for verses, titles and dialogue. Use no other fonts.
- Use `src/ui/format.ts` to format every number: `1,284`, then `12.4K`, then `3.21M`, then `1.00e12`. Never call `toString()` on a `Decimal` in UI code.
- **Layouts:** desktop (≥ 900 px wide) shows the cross-section with a right-hand panel. Phone portrait shows the full-screen cross-section with a bottom tray. Both must work for every UI ticket.

### 1.7 Saves

- Saves are written to `localStorage['undersong.save']` every 30 s, on `visibilitychange` and on `beforeunload`. The data is JSON compressed with lz-string.
- Every save has the shape `{ v: SAVE_VERSION, t: savedAtMs, state }`. `src/save/migrations.ts` holds one function per version step. **Never edit an old migration**; add a new one.
- Export and import use the same compressed string. Import validates before replacing, and a bad string shows an error without touching the current save.
- Keep a fixture save for each released version in `tests/fixtures/saves/`. A test loads every fixture and runs it through all migrations.

---

## 2. Code conventions

- TypeScript `strict`, with `noUncheckedIndexedAccess` turned on. Don't use `any`. When `unknown` is needed, narrow it right away.
- One module, one job. Files over ~300 lines are a smell; split them by concept, not by size.
- **Naming:** `camelCase` for functions and values, `PascalCase` for types and components, and `SCREAMING_SNAKE` for constants in `src/data`. Name things after game terms, such as `hireMiner`, `caveIn`, `lumenUpkeep`, `echoGain`, rather than generic ones like `doAction2`.
- Write comments only for the _why_. Formulas get a comment that names the `canon.md` section they implement, for example `// canon §4.3 Echo gain`.
- No default exports, except for Preact components when they're the file's single purpose.
- Errors: the sim never throws during play. An invalid action is a no-op and returns state unchanged. Throw only on programmer errors, such as unknown action types, which are caught in dev builds.

### Approved dependencies

| Package                                                  | Why                                               |
| -------------------------------------------------------- | ------------------------------------------------- |
| `break_eternity.js`                                      | Big numbers                                       |
| `preact`                                                 | UI overlay                                        |
| `lz-string`                                              | Save compression                                  |
| `vite`, `typescript`, `vitest`, `eslint`, `prettier`     | Tooling                                           |
| `@preact/preset-vite`, `typescript-eslint`, `@eslint/js` | Tooling glue for the above                        |
| `tsx`, `@types/node`                                     | Running and typing the TypeScript tools (ADR-012) |

Anything else needs an ADR in `decisions.md` before it's installed.

---

## 3. Data and balance

- Every tunable value is defined in `src/data/` (`materials.ts`, `buildings.ts`, `recipes.ts`, `echoes.ts`, `biomes.ts`, `verses.ts`), typed and exported as `as const` tables.
- `canon.md` is the human-readable mirror. **When you change a number in `src/data`, change `canon.md` in the same commit**, and the other way round. `tests/canon.test.ts` parses the canon tables and checks they match the data.
- Balance changes must come with before and after output from `npm run sim`, pasted into the PR body.
- Targets for pacing are in canon §5. If a change moves the time to a milestone by more than 15%, flag it in the PR.

---

## 4. Pixel art pipeline

### 4.1 Sprite format

```
# assets/sprites/items/lantern.sprite
palette: ui.lantern        # named sub-palette from palette.json
size: 16x16
anchor: 8,15               # optional, defaults to bottom centre
frames: 1                  # optional; frames are stacked vertically in the grid
---
................
....kkkkkkkk....
...
```

- Each character is a key in the named sub-palette, and `.` means transparent.
- `assets/sprites/palette.json` holds the **32 master colours** (canon §6.1) and the named sub-palettes, which map keys to master colours only.

### 4.2 Art rules (enforced by `npm run lint:sprites`)

1. Use master palette colours only. A hex value outside canon §6.1 fails the lint.
2. Sizes: tiles are 16×16, characters are 16×24, items are 16×16 and the UI icons are 8×8 or 16×16. Nothing else without an ADR.
3. Each material has **four tile variants** and uses a three-tone ramp: base, light and dark.
4. Faces exposed to air get a highlight on top and left edges and a shadow on bottom and right edges. The renderer applies this from masks, so don't paint it into the tile art.
5. Sprites self-outline with the darkest colour in their ramp. Never use pure `#000000`.
6. Back walls use the same tile art at 42% brightness. The renderer does this, so don't draw separate wall art.
7. Animation runs at 8–12 fps. Walks have 4 frames, swings 3 and idle loops 2.
8. Sprites are not rotated, scaled by fractions, blurred or drawn with gradients.

### 4.3 Making new art

- A new ore is a new sub-palette mapped onto the existing ore overlay grid. Don't redraw it.
- A new biome is a new palette entry in canon §6.2 plus generator rules in `src/world/biomes.ts`.
- For a new creature or character, first sketch it at 8×8 in a comment block in the PR, then make it at 16×24.
- After adding art, run `npm run lint:sprites` and check it at `/#atlas` and in-game at ×2 and ×4.

---

## 5. Story implementation

- Verses: `src/story/verses.ts`, with exactly 12 entries. Each has an `id`, a `numeral`, two lines of `text`, a `biome` and a `trigger`. The text comes from canon §3 and nowhere else.
- Village lines: `src/story/lines.ts`. Each line has conditions (`minDepth`, `versesFound`, `cycle`). Lines are short, one or two sentences in plain spoken British English.
- Triggers are pure functions of state that return story events. The sim queues those events and the UI shows them. Story code never changes resources directly.
- Tone rules: wonder that turns into melancholy, with no jokes inside verses. Bram is allowed to be dry and funny, and Pell never explains anything.

---

## 6. Testing

| Layer                   | What to test                                                                                       | Tool                         |
| ----------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------- |
| `src/sim`               | Every action and formula, prestige reset rules and offline catch-up within 2%                      | Vitest                       |
| `src/world`             | Generator determinism (same seed gives the same chunk), light flood-fill values and water settling | Vitest                       |
| `src/save`              | Round-trips and every fixture migrating cleanly                                                    | Vitest                       |
| `src/data` ↔ `canon.md` | Values match                                                                                       | Vitest                       |
| Sprites                 | Palette, size and naming                                                                           | `lint:sprites`               |
| Balance                 | Time to each milestone is no more than 15% past its canon target (ADR-035)                          | `npm run sim` in CI          |
| UI                      | Manual check at 1280×800 and 390×844, with screenshots in the PR                                   | Playwright screenshot script |

A bug fix is only finished when a test reproduces the bug first.

---

## 7. Performance budgets

- A frame on a mid-range phone takes **under 8 ms** at ×3 scale with 60 visible chunks.
- The lighting update for one changed tile takes **under 2 ms**.
- A sim tick takes **under 1 ms** at end-game state sizes.
- The save string is under **200 KB** after a 14-hour run, which is what the chunk-change storage is for.
- The first load is **under 1.5 MB** gzipped, including the atlas and fonts.

If a change breaks a budget, it is not done.

---

## 8. Definition of done (every ticket)

- [ ] Every acceptance criterion in the ticket is met, checked one by one.
- [ ] Nothing from the ticket's "Out of scope" list was built.
- [ ] `npm run check` is green.
- [ ] New logic has tests, and bug fixes have a regression test.
- [ ] Data changes are mirrored in `canon.md`.
- [ ] UI changes have been checked at desktop and phone sizes, with screenshots in the PR.
- [ ] Performance budgets still hold. Note the numbers if the ticket touches render or lighting.
- [ ] `roadmap.md` is ticked, a `progress.md` entry is added and any ADR is written.

---

## 9. Anti-drift checklist

Run through this before opening a PR. Each item is a known failure mode for AI-written code in this project.

- Did I invent a number, name or verse line instead of taking it from `canon.md`?
- Did I add a dependency, a font or a colour outside the palette?
- Did I use `Math.random`, `Date.now` or the DOM inside `src/sim` or `src/world`?
- Did I use a plain `number` for a resource amount?
- Did I build something "while I was there" that isn't in the ticket?
- Did I change the save shape without bumping `SAVE_VERSION` and adding a migration?
- Did I draw art in code instead of adding a `.sprite` file?
- Did I only test at one screen size?
- Did I say something works when I didn't run it?

---

## 10. Git and pull requests

- Branch names follow `m{N}/{ticket-id}-{slug}`. Each ticket gets one PR, and draft PRs are fine early.
- Commit messages: `M0-03: render chunk cache with dirty flags`, with the ticket ID first.
- The PR body says what changed (before and after), how it was checked, which acceptance criteria are met, anything stubbed and any screenshots.
- Never force-push to `main`. Use squash merges.
