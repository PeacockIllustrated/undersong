# Undersong roadmap

**Current milestone: M0 Bedrock** (PR #1; M1 starts on a stacked branch per ADR-009)

Work on the first unchecked ticket in the current milestone. M0 and M1 are broken into full tickets. Later milestones are listed as epics, and they're split into tickets (using the template below) **as the first task of that milestone**. They aren't split earlier, because what we learn in each milestone changes the next one.

Sizes: **S** is one focused session, **M** is two or three sessions and **L** should be split before starting.

### Ticket template

```
### [ ] M{N}-{NN} · Title · Size
Goal: one sentence on what the player or developer can do afterwards.
Acceptance:
  1. Testable statement.
  2. …
Out of scope: things that are tempting and belong to later tickets.
Depends on: ticket IDs.
PR: (link when done)
```

---

## M0 · Bedrock: engine and pipeline

**Exit:** a lit, scrollable cross-section you can dig into with the mouse or a tap, on desktop and phone, with a save that survives a reload.

### [x] M0-01 · Repo scaffold · S
Goal: an empty project that builds, tests and lints.
Acceptance:
1. Vite, TypeScript strict and Preact are set up. `npm run dev` shows a blank canvas with the page title "Undersong".
2. `npm run check` runs typecheck, ESLint, Prettier and Vitest, and passes with one sample test.
3. ESLint `no-restricted-globals` blocks `Math.random`, `Date` and `document` inside `src/sim/**` and `src/world/**`.
4. The folder layout matches the map in `CLAUDE.md`, and `docs/` is copied in.
5. CI (GitHub Actions) runs `npm run check` on every PR.
Out of scope: any gameplay, rendering or art.
PR: https://github.com/PeacockIllustrated/undersong/pull/1

### [x] M0-02 · Palette and sprite format · S
> Criterion 3 was replaced by the runtime atlas (ADR-011); the lint has a failing fixture per rule in `tests/sprites.test.ts`.
Goal: art can be written as text and checked automatically.
Acceptance:
1. `assets/sprites/palette.json` holds the 32 colours from canon §6.1 and at least the sub-palettes used by M0 art.
2. `tools/lint-sprites.ts` fails on: an unknown palette key, a colour not in the master palette, a size not allowed by canon §6.3, a ragged row or a bad filename.
3. `tools/build-atlas.ts` packs every `.sprite` into `public/atlas.png` and `atlas.json`, with frames and anchors.
4. Tests cover both tools, including one failing fixture for each lint rule.
Out of scope: drawing the full asset set (that's M0-07).
Depends on: M0-01.
PR: https://github.com/PeacockIllustrated/undersong/pull/1

### [x] M0-03 · Chunked world and generator · M
Goal: a deterministic mountain cross-section exists in memory.
Acceptance:
1. 32×32 chunks are stored in typed arrays, as `dev-bible` §1.4 describes.
2. The generator is deterministic from `(seed, cx, cy)`. A test checks that the same seed gives byte-identical chunks.
3. It produces the grass line, a dirt band of 4 tiles, stone with copper and tin pockets, and depth bands for biome 1 only.
4. Chunk diffs (mined tiles) can be applied and serialised.
Out of scope: biomes 2 and below, caves beyond simple pockets, water and heat.
Depends on: M0-01.
PR: https://github.com/PeacockIllustrated/undersong/pull/1

### [x] M0-04 · Tile renderer and camera · M
> Measured with 4× CPU throttle in headless Chromium: about 1.5 ms per frame at 1280×800 and at 390×844 (×3 DPR). Read live from `window.undersongPerf`.
Goal: you can see and scroll the world crisply.
Acceptance:
1. Each chunk is cached to an offscreen canvas and redrawn only when dirty.
2. Edge highlight and shadow come from neighbour masks (dev-bible §4.2 rule 4), with four variants picked by a position hash.
3. Back walls render at 42% brightness.
4. Integer scale is ×2 below 600 px wide, ×3 up to 1400 px and ×4 above. There's no smoothing, and the camera snaps to whole pixels.
5. Drag or swipe pans vertically and the mouse wheel scrolls. The camera is clamped to the world.
6. 60 visible chunks render in under 8 ms per frame on a mid-range phone profile (Chrome devtools 4× CPU throttle).
Out of scope: lighting (M0-05), sprites other than tiles.
Depends on: M0-02, M0-03.
PR: https://github.com/PeacockIllustrated/undersong/pull/1

### [x] M0-05 · Two-channel lighting · M
Goal: darkness and light behave as described in canon §7.
Acceptance:
1. A breadth-first flood fill computes warm and cool light per tile, using the decay values from canon §7.
2. Only dirty chunks plus one neighbour in each direction are recomputed. A single-tile change costs under 2 ms.
3. The light overlay and tints match canon §7, and torch flicker is applied in render only.
4. Tests check exact light values for a torch in a straight stone tunnel. The values must match the strip in the design bible: 1.00, 0.92, 0.83 and so on.
Out of scope: lanterns, Lumen and glowcaps as placeable items (M2).
Depends on: M0-04.
PR: https://github.com/PeacockIllustrated/undersong/pull/1

### [x] M0-06 · Sim loop, state, save and load · M
Goal: a fixed-tick pure sim with saves that survive a reload.
Acceptance:
1. `GameState`, actions, `sim.step` and the seeded RNG are in place, as dev-bible §1 describes.
2. The 10 Hz accumulator runs at most 50 ticks per frame.
3. The game saves every 30 s and on `visibilitychange` and `beforeunload`, compressed and versioned (`SAVE_VERSION = 1`).
4. Export and import strings work, and a bad import shows an error without touching the current save.
5. Fixture `tests/fixtures/saves/v1.json` exists and loads.
Out of scope: offline progress (M2), the economy.
Depends on: M0-01.
PR: https://github.com/PeacockIllustrated/undersong/pull/1

### [ ] M0-07 · Style sheet: 20+ production assets · M
> 67 sprites and `/#atlas` are done. Missing: the Foreman's 4-frame walk, the rope coil and winch items (they arrive with haulage in M1).
Goal: the M1 art exists and passes the lint.
Acceptance:
1. Tiles, each with 4 variants: grass, dirt, stone, copper ore, tin ore.
2. Foreman at 16×24 with idle (2 frames), walk (4) and swing (3).
3. Items: wooden, copper and bronze picks, torch, copper bar, tin bar, bronze bar, rope coil, winch.
4. Props: Bunkhouse, Forge, headframe, chest, verse carving (an unlit and a glowing frame).
5. Everything passes `lint:sprites`, and an `/atlas` dev route shows every sprite at ×4.
Out of scope: Act II and later art, villagers other than the Foreman.
Depends on: M0-02.
PR: https://github.com/PeacockIllustrated/undersong/pull/1

### [x] M0-08 · Dig interaction · S
Goal: you can dig.
Acceptance:
1. Clicking or tapping a solid tile next to air mines it after the time set by canon §4.6, using pickPower 1. A progress crack overlay shows over 3 frames.
2. Holding keeps mining the targeted tile. Tiles not next to air are refused with a short shake.
3. The mined tile updates the chunk diff, the render cache and the lighting.
4. The change persists through a save and reload.
Out of scope: ore pickups, inventory, miners.
Depends on: M0-04, M0-05, M0-06.
PR: https://github.com/PeacockIllustrated/undersong/pull/1

---

## M1 · First Verse: vertical slice of Act I

**Exit:** a new player plays for about 45 minutes, finds Verses I and II, triggers a Cave-in and wants to dig again. Balance sim lands within ±15% of the canon §5 targets up to the first Cave-in.

### [ ] M1-00 · Ticket M1 · S
Goal: split this milestone into final tickets, using M0's lessons.
Acceptance: the epics below are rewritten as tickets in the template format, with acceptance criteria and out-of-scope lists. Tom has seen the list.

Epics (draft):
- **Resources and inventory.** Ore drops, `Decimal` amounts and the HUD counters.
- **Forge.** Smelting and recipes from canon §9, plus pick upgrades.
- **Bunkhouse and miners.** Hiring, assigning faces, the light factor and miner sprites.
- **Haulage.** The rope and the winch, with throughput from canon §4.9.
- **Vein Rush.** The chain multiplier, with a light feedback effect.
- **Verses I–II.** Placement rules, the discovery moment, the verse card and Pell's and Bram's first lines.
- **Cave-in.** Unlock conditions, the collapse sequence, the Survey Book, and the reset and keep rules. Saves migrate to v2.
- **Echo upgrades.** The five from canon §10.
- **Balance sim v1.** A headless player bot that reports time to each milestone.
- **Burrow beetles.** A simple pest: it stalls a miner in the dark, and a tap removes it.

---

## M2 · Glowroot: core systems for Act II
Epics: the Lamp-works and Lumen budget, lantern placement, glowcap light, rails and lifts and supports, lantern moths, the full three-branch Echo tree, offline progress with the "While you were away" summary, a polished phone layout with the bottom tray, Old Wren, and Verses III–V.
**Exit:** Acts I and II are playable from start to finish on desktop and phone.

## M3 · Drowned: Act III
Epics: water simulation and pumps, the drowned town set piece, the Singing Geodes, the Song-loom and charms, cave eels and shard golems, and Verses VI–X.
**Exit:** playtesters can explain what Holloway is hiding.

## M4 · The Heart: Act IV and the ending
Epics: Ember Deep with heat and cooling, the Hollow Heart with old shafts from earlier cycles, Verses XI–XII, both endings, Endless Depth and New Song+.
**Exit:** the game can be finished, and both endings feel earned.

## M5 · Surface: polish and launch
Epics: layered music and sound effects, a full balance pass, accessibility (reduced motion, text scale, light shown by more than colour), achievements, settings, and launch on the web (Vercel) and itch.io.
**Exit:** public release.

---

## Parking lot

Good ideas that are out of scope right now. Add to this list instead of building them. Review it when ticketing each milestone.

- Foreman 4-frame walk cycle, rope-coil and winch item sprites (finishes M0-07; do with M1 haulage).
- Render-only lamp glow passes through rock; consider occluding it by solid tiles.
