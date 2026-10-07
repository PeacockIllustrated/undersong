# Undersong roadmap

**Current milestone: M7 Touch and aim** (M7 to M12 approved by Tom on 2026-10-07)

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
Sound moved to its own update in another thread at Tom's request (2026-10-06): see R · Review fixes and sound below.

- [x] **M5-01 Settings.** A Settings panel from the menu, saved apart from the game: motion, text size, shape marks, number style (ADR-024). Sound rows join it with the sound update.
- [x] **M5-02 Accessibility.** Reduced motion (device or setting) stops screen shake and every animation; text scales to 1.3×; dark faces and faces too hot to work are shown by shape as well as colour.
- [x] **M5-03 Achievements.** Milestones worth a badge across cycles, shown in the Survey Book, kept through a Cave-in.
- [x] **M5-04 Launch.** An itch.io build (relative paths, zipped by `npm run build:itch`), page text in `docs/itch-page.md`, a favicon and page description. How to play is covered by the intro line, the one-time tips and the controls in the menu. Publishing the itch.io page needs Tom's account.
- [x] **M5-05 Balance pass.** After the offline catch-up fixes land: re-run every act's sim and retune anything outside ±15%. No game numbers changed; two sim bot bugs fixed (ADR-028). PR: see progress.md.

## R · Review fixes and sound (Tom's request, ADR-026, ADR-027)

From the code review in `/mnt/project-files/reviews/undersong-code-review.md`.

- [x] **R-01 Offline pays in full.** Catch-up steps carry leftover work; 8 h away lands within 5% of real time (test).
- [x] **R-02 No freeze on return.** Frontier and face cache; 8 h with 40 miners catches up in about 1 s, live play unchanged.
- [x] **R-03 Short absences count.** Under a minute plays on at full speed (canon §4.8 amended).
- [x] **R-04 Pacing gate.** `--strict`; Act I sim on every PR, Act II, Act III and the ending nightly.
- [x] **R-05 Sound.** Synthesised effects for every event, the verse song, the hum, Sound and The hum settings, M to mute (canon §16).

## M6 · Holloway Above (Tom's request, ADR-029)

Tom approved this on 2026-10-06 from the proposal at https://claude.ai/artifact/VPksRKJCXFApnzqmuqQVgT. The surface only adds: no hunger, no spoiling, no penalty. Every chore gets a helper (ADR-020). Numbers in canon §17.
**Exit:** the fields and the woodlot are part of every run, and every pacing target is still within ±15%.

- [x] **M6-01 Surface view.** A Look up button (▲) pans to the fields; ⌖ comes back down. A HUD chip counts ripe crops and jumps to them. A feast chip shows the time left.
- [x] **M6-02 Tansy and the fields.** Tansy arrives with the first miner and one free plot; plots, barley, hand harvests ×2, golden ears ×10, Tansy's hands.
- [x] **M6-03 The cookhouse.** Miner's bread and Foreman's porridge, the feast bell and its setting; a toast for every purchase.
- [x] **M6-04 Rook and the woodlot.** Rook at 80 ft, saplings, four stages, felling, Rook's axe, the charcoal hearth, pit props and cottages (drawn in a back row).
- [x] **M6-05 Trees through the Cave-in.** Trees stand through a Cave-in; elders after 3 drop timber; their roots grow 25 ft per Cave-in, soften the rock and make copper and tin glint.
- [x] **M6-06 The cairn and the tally board.** The cairn by the headframe gains a stone per Cave-in (up to 5); the Village tab lists each stone's depth and the change from the run before, under a tally board of goods per second by source. (PR #16)
- [x] **M6-07 Act crops.** Glowcap beds in a root cellar, cress paddies watered by pumps with cress soup (haul +20% a level), firepepper hot-beds warmed by ember ore with pepper broth (heat tolerance +0.1 a level, up to 3). Paddies and hot-beds are plots turned over (ADR-030). (PR #17)
- [x] **M6-08 Balance.** The sim bot tends the surface every 30 s (reaps and fells by hand until the helpers take over, rings the bell, eats, spends spare copper on plots and saplings, and timber on the hearth and cottages). `--surface=off` turns it off for comparison.

---

## M7 to M12 · What to dig next (Tom's request, 2026-10-07)

Tom approved all forty ideas from https://claude.ai/artifact/UsaEt12C1SSRMKns5xGjA1 on 2026-10-07 ("ticket all items until implemented"). Order: touch and aim first, then payoffs, the deep game, finds, beyond the song, and keeping the save. Every new number goes in `src/data` and canon; every save change bumps `SAVE_VERSION` with a migration and a test; UI is checked at 1280×800 and 390×844.

## M7 · Touch and aim

**Exit:** on a phone you can always see the tile you are about to dig, and on a desktop you can see what is under the mouse.

### [x] M7-01 · The loupe · M · PR #19
Goal: a touch on rock shows a magnifier above the finger, so the target is never hidden.
Acceptance:
  1. A touch held on rock shows a round loupe about 100 CSS px above the finger, showing the tiles under the finger at 2× their on-screen size with the target tile outlined; it flips to the side near the top edge.
  2. While dragging, the loupe follows and shows the dig path. Nothing is queued until the finger lifts; lifting off the canvas edge cancels.
  3. Settings has Aim: Loupe (default on touch), Crosshair (a cursor floating 64 px above the finger) or Off. Saved with the other settings.
  4. Render only reads state; input stays in `src/render/input.ts`. Pixel art stays integer-scaled (the loupe is a ×2 integer blit).
Out of scope: pinch zoom (M7-05), smart dig (M7-02).
Depends on: none.

### [x] M7-02 · Smart dig · S · PR #19
Goal: taps snap to ore and a long press takes the whole vein.
Acceptance:
  1. A Smart dig toggle in Settings (default on; ADR-031). With it on, a tap on rock within 1 tile of exposed, diggable ore targets the ore instead.
  2. A press held 600 ms on an ore tile without dragging queues every connected (8-way) visible ore tile of that vein the pick can break, nearest first, up to the queue limit.
  3. Tests cover the snap and the vein queue in a pure helper.
Out of scope: Vein Break (M8-02).

### [x] M7-03 · Hover highlight · S · PR #19
Goal: the mouse shows what it is over.
Acceptance:
  1. On a mouse, the tile under the pointer is outlined. After 400 ms a small label shows material name, Foreman time to break it and what it drops, or "Needs the X pick" in red.
  2. No label on touch devices. Label text lives in `src/story`.

### [x] M7-04 · Tips out of the way · S · PR #19
Goal: tips never cover the dig face.
Acceptance:
  1. Tip cards show as a slim strip under the header, one at a time.
  2. A tip only shows once its system is in play this run (water: flooded tiles reached; and so on), and tips not yet shown are dropped when their act is behind the player.
  3. Checked at both layouts.

### [x] M7-05 · Pinch zoom and the whole mountain · M · PR #19
Goal: zoom in to aim, out to see the crew working.
Acceptance:
  1. Pinch on touch, or Ctrl + wheel and +/− keys on desktop, step through whole-number render scales (phone ×1 to ×3 art scale, desktop ×2 to ×4).
  2. A Mountain button zooms to show the whole cross-section from the fields to the deepest miner, then back. Lighting and sprites stay crisp (integer scaling only); ADR records how the far view is drawn.
  3. Frame time stays inside the dev-bible budget at the far zoom with 40 miners.
Note: covers idea 8 "See the whole mountain".

### [x] M7-06 · Small fixes · S · PR #19
Acceptance:
  1. Escape closes the open sheet before it clears the queue.
  2. ⌖, ▲ and ☰ get pixel icons with labels on phones ("Foreman", "Fields", "Menu").
  3. Haptics where the device supports them: a short buzz when the Foreman breaks a tile, a stronger one on ore during Vein Rush, behind a Settings toggle.

## M8 · Payoffs

**Exit:** something to buy at almost every moment of Act I, and every reward is something you see.

### [ ] M8-01 · A busier first five minutes · M
Goal: no long wait with nothing to buy at the start.
Acceptance:
  1. The sim's longest wait with nothing to buy in the first 15 minutes has a median under 90 s, and `--strict` fails above it.
  2. Every Act I target in canon §5 stays inside ±15%; at least 3 miners at the first Cave-in in the median run.
  3. New numbers in canon and an ADR (likely a cheaper first miner and one more cheap repeatable buy).

### [ ] M8-02 · Vein Break · M
Goal: at Vein Rush ×5, the next ore tap shatters the connected vein.
Acceptance:
  1. Breaking an ore tile with the chain at the cap breaks every connected ore tile of that vein the pick can break, up to a cap in `src/data`, one after another outward, each paying as if hand-mined at ×5.
  2. Each tile pops with the ore sound climbing; Glowroot veins flash, Geode veins ring.
  3. Sim: pacing targets still inside ±15%.

### [ ] M8-03 · Buy ×10 and Max, and "ready in" · S
Acceptance:
  1. A ×1 / ×10 / Max toggle on the Village sheet applies to miners, the whetstone, plots, saplings, cottages and meals; the button shows the total.
  2. Anything not affordable shows "ready in 40 s" from the current income of that resource, or "needs X" when there is no income.
  3. Buying many at once raises one toast with the total jump.

### [ ] M8-04 · The ore heap · S
Acceptance:
  1. Hauled ore waiting for the forge draws as a heap beside the headframe whose size follows the backlog; bars stack beside the forge.
  2. Render only; new sprites pass `lint:sprites`.

### [ ] M8-05 · A Village you can shop at a glance · M
Acceptance:
  1. Each tab lists affordable things first; the price is inside the button; a missing resource is red.
  2. Descriptions are one line, with the rest behind a tap.
  3. On a phone the sheet is half height so the mine stays visible.
  4. Units read as players think: ore a minute instead of hardness a second; no ".00".
Note: covers U7 and U8's unit fixes.

### [ ] M8-06 · Chips, header and alerts · S
Acceptance:
  1. Each ore chip uses its ore's colour; ore and bars are grouped; tap or hover shows name and rate.
  2. The phone header is one line (depth · biome edge colour · best).
  3. Every alert is a button to its fix: Held back by opens the right purchase or shows the stalled miners; Out of Lumen opens the Lamp-works.
Note: covers U6, U8, U9 and idea 15.

## M9 · The deep game

**Exit:** no stretch of more than 10 minutes with nothing to buy in any act of the median sim run, and the Cave-in feels like a payout.

### [ ] M9-01 · Waits in every act · S
Acceptance:
  1. The sim reports the longest wait with nothing to buy per act and per run, not just the first 15 minutes.
  2. The nightly sim fails when any act's median longest wait is over 10 minutes (CI gate for Act I stays as M8-01).

### [ ] M9-02 · Something to buy in the deep game · M
Acceptance:
  1. Silver, gold, resonant crystal and ember ore each have a cheap repeatable buy like the whetstone, resetting on a Cave-in, with numbers in canon.
  2. M9-01's gate passes; the Act III and ending targets stay inside ±15%.

### [ ] M9-03 · The bunkhouse remembers · S
Acceptance:
  1. A new Memory Echo upgrade: after a Cave-in, miners hire themselves as bars come in, up to last run's count.
  2. Save change with migration and test (last run's miner count).

### [ ] M9-04 · A Cave-in worth watching · M
Acceptance:
  1. The Cave-in plays a sequence of about 6 s: the shaft folds in from the top, Echoes count up over the notes of this run's verses, a stone drops on the cairn, then the new run opens with "last cycle you reached N ft".
  2. Tap to skip; reduced motion shows a still card; the sim is unaffected.

### [ ] M9-05 · Race your last run · S
Acceptance:
  1. The depth ruler shows a ghost mark for where you were at this minute of the last run; passing it toasts "N min ahead of last cycle".
  2. Save change: the last run's depth by minute, capped in size, with migration and test.

### [ ] M9-06 · Lead from the front · S
Acceptance:
  1. Miners within a radius of the Foreman dig faster by a factor in `src/data` (start ×1.5), shown as a glow on those miners.
  2. Pacing targets still inside ±15%.

## M10 · Finds

**Exit:** every session has a surprise worth coming back for.

### [ ] M10-01 · The tinker's cart · M
Acceptance:
  1. Every 6 to 10 minutes a cart parks by the shaft with three offers; you pick one; it waits for you and while you are away.
  2. Offers and odds in `src/data`; save change with migration and test; the sim bot takes the first offer.

### [ ] M10-02 · The curio shelf · M
Acceptance:
  1. About 1 tile in 350 drops a curio: common, fine or singing, each with its own sound. Four per biome in six sets, each a small permanent bonus and a bigger one for a full set.
  2. The shelf (Survey Book page) shows found and missing curios; curios survive the Cave-in. Save change with migration and test.

### [ ] M10-03 · Pell's dog · S
Acceptance:
  1. A helper (canon §14) that walks to the nearest unopened chest within 30 tiles and fetches it once a worker is close. Save change for the helper flag.

### [ ] M10-04 · Day, night and rain · S
Acceptance:
  1. An eight-minute sky cycle with lit windows at dusk and fireflies over the fields (render only).
  2. Rain now and then makes crops grow ×3 for a minute; it waits while you are away. Numbers in canon §17.

## M11 · Beyond the song

**Exit:** the game after the ending keeps paying and can run itself.

### [ ] M11-01 · Endless Depth that keeps paying · M
Acceptance:
  1. Every 500 ft past the Heart floor is a marker with a reward that grows each time, and a pick line past the Heart pick that doubles at each marker.
  2. Numbers in canon; save change with migration and test.

### [ ] M11-02 · Let the Cave-in run itself · S
Acceptance:
  1. After the song has been sung once, Settings offers Auto Cave-in: it caves in when Echoes on offer have not risen for a set time, and logs a line each time.

### [ ] M11-03 · New Song+ in a new key · L (split before starting)
Acceptance:
  1. Each sung song picks the next mountain's key, shown before you choose: one rule changes (wet year, hot year, rich veins, at least four keys).
  2. Keys in `src/data` and canon; save change with migration and test.

## M12 · Keep it

**Exit:** a save can't be lost, the game installs on a phone, and the sim covers every system.

### [ ] M12-01 · Save export and import · S
Acceptance:
  1. Settings can copy the save as text, download it as a file, and import pasted text or a file, with a confirm step and a validity check.

### [ ] M12-02 · Install on a phone · S
Acceptance:
  1. A web manifest and a hand-written service worker (no new dependency; ADR) make the site installable and playable offline, on Vercel and in the itch.io zip without breaking either.

### [ ] M12-03 · Layout smoke test · S
Acceptance:
  1. An ADR adds Playwright as a dev dependency; CI boots each save fixture at 1280×800 and 390×844, checks there are no page errors and no horizontal overflow, and keeps screenshots as artifacts.

### [ ] M12-04 · Sim coverage · S
Acceptance:
  1. The bot places pumps so cress paddies appear in sims; it buys plots so the feast bell can ring; whether 150 crops is reachable in an ordinary run is answered in progress.md.
  2. The slow Act III seeds are explained in progress.md, with a fix ticketed if the cause is the game.

---

## Parking lot

- Holloway Above ideas still open: none (the cart, curio shelf, Pell's dog, day and night, rain and the ore heap are now M8 and M10 tickets).

- The lantern sprite reads small at ×2; give it a brighter frame or a bracket.
- The bot places far too many torches; a smarter light plan would make the sim closer to a careful player.

Good ideas that are out of scope right now. Add to this list instead of building them. Review it when ticketing each milestone.

- Foreman 4-frame walk cycle, rope-coil and winch item sprites (finishes M0-07; do with M1 haulage).
- Render-only lamp glow passes through rock; consider occluding it by solid tiles.
- Miners walk between faces instantly; animate the walk.
