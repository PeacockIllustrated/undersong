# Undersong roadmap

**Current milestone: M2 Glowroot** (M0 in PR #1, M1 in PR #2, stacked per ADR-009)

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
> Goal: art can be written as text and checked automatically.
> Acceptance:

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
> Goal: you can see and scroll the world crisply.
> Acceptance:

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
> Goal: the M1 art exists and passes the lint.
> Acceptance:

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

### [x] M1-00 · Ticket M1 · S

Done: the epics became the tickets below. Tom sees them through the Dig Log rather than a review stop, since he asked for an unattended build.
PR: https://github.com/PeacockIllustrated/undersong/pull/2

### [x] M1-01 · Resources, drops and HUD · S

Acceptance: ore drops land in the pack (Foreman) or wait at the shaft bottom (miners); HUD chips show held resources with sprite icons; numbers format with suffixes.
PR: https://github.com/PeacockIllustrated/undersong/pull/2

### [x] M1-02 · Forge and picks · S

Acceptance: canon §9 smelting with a recipe picker (any ore, copper, tin, bronze); copper and bronze picks; changing recipe never loses progress unless it actually changes.
PR: https://github.com/PeacockIllustrated/undersong/pull/2

### [x] M1-03 · Bunkhouse and miners · M

Acceptance: hire at canon §9 cost × 1.15ⁿ; miners pick faces by the ADR-016 reach rule and canon §9.1 priority; rate is pickPower × lightFactor against H(d); miner sprites animate at their faces.
PR: https://github.com/PeacockIllustrated/undersong/pull/2

### [x] M1-04 · Haulage and torches · S

Acceptance: canon §4.9 throughput from the shaft depth; rope and winch; torches crafted 3 per copper bar and placed or picked up with the Torch tool.
PR: https://github.com/PeacockIllustrated/undersong/pull/2

### [x] M1-05 · Vein Rush · S

Acceptance: canon §4.7 chain with a HUD readout and a floating multiplier.
PR: https://github.com/PeacockIllustrated/undersong/pull/2

### [x] M1-06 · Verses I–II and village lines · M

Acceptance: verses are found by opening rock beside their carving; a verse card shows canon text; Pell's and Bram's lines fire on their triggers once per run; old chests give canon §9.1 loot.
PR: https://github.com/PeacockIllustrated/undersong/pull/2

### [x] M1-07 · Cave-in, Survey Book, Echo upgrades · M

Acceptance: unlock per canon §4.10; Echo gain per §4.3; the run resets and the world reseeds; the Survey Book shows the run, the five §10 upgrades, verses and pages (three pages already in the Foreman's hand); save v2 with a migration and fixture.
PR: https://github.com/PeacockIllustrated/undersong/pull/2

### [x] M1-08 · Balance sim v1 · S

Acceptance: `npm run sim -- --until=first-cavein` runs a bot over several seeds and checks canon §5 targets.
PR: https://github.com/PeacockIllustrated/undersong/pull/2

### [x] M1-09 · Burrow beetles · S

Acceptance: per canon §9.1; a HUD alert jumps the camera to the stopped miner.
PR: https://github.com/PeacockIllustrated/undersong/pull/2

## M2 · Glowroot: core systems for Act II

Epics: the Lamp-works and Lumen budget, lantern placement, glowcap light, rails and lifts and supports, lantern moths, the full three-branch Echo tree, offline progress with the "While you were away" summary, a polished phone layout with the bottom tray, Old Wren, and Verses III–V.
**Exit:** Acts I and II are playable from start to finish on desktop and phone.

- [x] **M2-01 Act II data and save v3.** Iron, spores, Lumen, bricks, buildings, crafts, picks to Heartstone; save v3 with migration and fixture. PR #3
- [x] **M2-02 Kiln, Lamp-works and Lumen.** Buildings bought in levels; Lumen upkeep; lanterns go dark at 0 Lumen. PR #3
- [x] **M2-03 Lanterns, supports and moths.** Lantern and Support tools; lantern moths; small collapses held off by supports. PR #3
- [x] **M2-04 Rails.** Third haul tier, priced per 10 tiles of mine depth. PR #3
- [x] **M2-05 Pick gates and shrines.** Canon §8.1; Verses III–V in old brick (ADR-017). PR #3
- [x] **M2-06 Echo tree.** Three branches of six; Echo power; Heirloom Pick, Old Shafts, Bram's Ledger. PR #3
- [x] **M2-07 Offline progress.** Catch-up on load and tab return, "While you were away" sheet (ADR-019). PR #3
- [x] **M2-08 Old Wren and Verses III–V.** Wren's lines, Act II triggers, Wren by her Lamp-works. PR #3
- [x] **M2-09 Phone bottom tray.** Tools as a full-width tray above the nav on phones. PR #3
- [x] **M2-10 Balance sim to Act II.** `--until=act2` plays through Cave-ins; Glowroot cleared within ±15% of 4 h. PR #3
- [x] **M2-11 Smooth lighting** (Tom's request). ADR-018. PR #3

## J · Juice pass (Tom's request, ADR-020)

Apply the DangerouslyFunny taste report to Acts I and II.

- [x] **J-01 Helpers.** Lamplighters, Pell's rounds, Bram's props (canon §14). Survive the Cave-in.
- [x] **J-02 Homecoming.** ×3 after a Cave-in until 60% of best depth (canon §4.12).
- [x] **J-03 Verse loot.** Cache and permanent 5% per verse, shown on the verse card (canon §4.13).
- [x] **J-04 Whetstone.** Cheap repeatable copper sink (canon §4.14).
- [x] **J-05 Feedback.** Toasts, record shake, "Held back by", affordable glows, Survey worth-it line (canon §14.1).
- [x] **J-06 Retarget pacing.** Balance sim within ±15% of the new targets; tracks the longest wait with nothing to buy.

## P · UI polish (Tom's request, ADR-022)

Proposal approved by Tom: https://claude.ai/artifact/FfQQKoSRz89hwtSQXMv15k

- [x] **P-01 Cancel queued blocks.** Tap or drag over queued tiles to take them out; Clear queue chip; Esc.
- [x] **P-02 Readable queue.** Numbered tiles, order thread, progress bar under the face.
- [x] **P-03 Shaft-head floats.** What came up the shaft floats at the shaft head with its icon.
- [x] **P-04 Tip cards and NEW pips.** One tip per system, once ever; NEW on unused tools and unopened Village tabs.
- [x] **P-05 Biome banner.** First visit to a biome drops a banner with act, depth and one line.
- [x] **P-06 Edge arrows.** Pests, stalled miners and the nearest unfound verse, tap to look.
- [x] **P-07 Depth ruler.** Biome bands to scale, You / Best / Homecoming marks; tap a band to look.
- [x] **P-08 Miner faces.** Teal brackets on faces, an orange "!" on stalled miners.
- [x] **P-09 Village tabs.** Build / Hands / Loom with counts.
- [x] **P-10 Resource chips and phone tools.** Biome headline chips with rates, the rest in a tray; one-button tool picker on phones; hold ring.

## M3 · Drowned: Act III

Epics: water simulation and pumps, the drowned town set piece, the Singing Geodes, the Song-loom and charms, cave eels and shard golems, and Verses VI–X.
**Exit:** playtesters can explain what Holloway is hiding.

- [x] **M3-01 Water.** Levels 0–8 per tile, falling-sand settling, flooded tiles block reach (canon §12).
- [x] **M3-02 Pumps and Bram's pump crew.** Pump tool, drains topmost water first; the crew helper moves pumps to the water (canon §12, §14).
- [x] **M3-03 The drowned town.** Four houses under water; draining each tells more, Verses VI–VIII on the back walls, old lamps still lit.
- [x] **M3-04 Singing Geodes.** Singing stone gated at the silver pick, Verses IX–X in resonant crystal rings (canon §13).
- [x] **M3-05 Song-loom and charms.** Ten charms, one per verse, slots from loom levels, kept through a Cave-in (canon §13).
- [x] **M3-06 Eels and shard golems.** Eels bite miners at the water's edge; golems wake from crystal and take three taps. Pell's rounds handle both.
- [x] **M3-07 Act III story.** Lines for the Halls, the houses, the Geodes and the charms.
- [x] **M3-08 Save v5.** Water diffs and pump state, with a 4→5 migration and fixtures for v4 and v5.
- [x] **M3-09 Balance sim to Act III.** `--until=act3` reaches Act III end within ±15% of the target.

## M4 · The Heart: Act IV and the ending

Epics: Ember Deep with heat and cooling, the Hollow Heart with old shafts from earlier cycles, Verses XI–XII, both endings, Endless Depth and New Song+.
**Exit:** the game can be finished, and both endings feel earned.

- [x] **M4-01 Heat.** Worked out per tile from depth and hot rock; slows then stops miners, slows the Foreman; vents and standing water cool (canon §15).
- [x] **M4-02 Vents and Wren's cold lamps.** Vent tool and craft; the helper sets vents at faces too hot to work (canon §14, §15).
- [x] **M4-03 Cinder wisps.** Spawn at hot faces and stop a miner until tapped; Pell's rounds handle them.
- [x] **M4-04 Verses XI and XII.** XI in a ring of ember ore, XII in the Heartstone mound; Act IV lines for the Deep and the Heart.
- [x] **M4-05 The ending.** The choice at the Heart; a scene for each; both close the cycle.
- [x] **M4-06 Endless Depth and New Song+.** Sealing opens the floor 64 rows at a time; singing adds Echoes and sings the verses back.
- [x] **M4-07 Heat on screen.** Hot faces glow and shimmer; "Held back by: Heat"; vent card and tool.
- [x] **M4-08 Balance sim to the ending.** `--until=ending` reaches the ending within ±15% of 11 h 30 (ADR-023).
      PR: https://github.com/PeacockIllustrated/undersong/pull/8
      Out of scope: music, achievements and settings (M5).

## M5 · Surface: polish and launch

Epics: layered music and sound effects, a full balance pass, accessibility (reduced motion, text scale, light shown by more than colour), achievements, settings, and launch on the web (Vercel) and itch.io.
**Exit:** public release.
Sound moved to its own update in another thread at Tom's request (2026-10-06), so it has no ticket here.

- [x] **M5-01 Settings.** A Settings panel from the menu, saved apart from the game: motion, text size, shape marks, number style (ADR-024). Sound rows join it with the sound update.
- [x] **M5-02 Accessibility.** Reduced motion (device or setting) stops screen shake and every animation; text scales to 1.3×; dark faces and faces too hot to work are shown by shape as well as colour.
- [x] **M5-03 Achievements.** Milestones worth a badge across cycles, shown in the Survey Book, kept through a Cave-in.
- [ ] **M5-04 Launch.** An itch.io build (relative paths, zipped), a title and description, and a short how-to-play on first load.
- [ ] **M5-05 Balance pass.** After the offline catch-up fixes land: re-run every act's sim and retune anything outside ±15%.

---

## Parking lot

- The lantern sprite reads small at ×2; give it a brighter frame or a bracket.
- The bot places far too many torches; a smarter light plan would make the sim closer to a careful player.

Good ideas that are out of scope right now. Add to this list instead of building them. Review it when ticketing each milestone.

- Foreman 4-frame walk cycle, rope-coil and winch item sprites (finishes M0-07; do with M1 haulage).
- Render-only lamp glow passes through rock; consider occluding it by solid tiles.
- Sound (M5 epic), but a dig thunk and a smelt clink would help feel sooner.
- Miners walk between faces instantly; animate the walk.
