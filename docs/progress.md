# Progress log

Newest entry first. Add one at the end of every working session. Keep each entry short; the roadmap holds the detail.

```
## YYYY-MM-DD · ticket ID(s)
Done: what changed, with PR links.
State: is `npm run check` green? Is anything stubbed or known to be broken?
Next: the next ticket.
Questions for Tom: anything blocking or worth a decision (or "none").
```

---

## 2026-10-06 · M4 The Heart

Done: Act IV and the ending. Heat below 250 ft slows miners and then stops them at faces too hot to work; vents (tool, craft, and Wren's cold lamps helper) and standing water cool. Cinder wisps gather at hot faces and Pell's rounds handle them. Verse XI sits in a ring of ember ore and Verse XII in the Heartstone, which only the Heart pick breaks. Singing all twelve verses offers the choice: seal the shaft (Endless Depth, 64 more rows whenever the village nears the floor) or sing the last verse (New Song+, more Echoes, verses sung back). Hot faces glow on screen; "Held back by: Heat". ADR-023, PR #8.
State: `npm run check` green. Ending sim, 8 seeds continued from their Act III saves: 507, 530, 655, 691, 729, 739, 829, 838 min, median 710 against 690 (inside ±15%). The spread mostly comes from Act III (199 to 762 min). Tests for hot faces and the vent crew found a real bug (the crew and Endless Depth read the reach depth before it was worked out); fixed.
Not done: the roadmap epic's "old shafts from earlier cycles" in the Hollow Heart has no ticket and is not built; added to the Parking lot.
Next: M5 Surface (music and sound, balance pass, accessibility, achievements, settings, launch).
Questions for Tom: the ending choice and scene wording is mine; edit freely.

## 2026-10-06 · M3-09 Act III tail

Done: the two sim seeds that never finished Act III sat at 1000 ft with aquamarine to spare but not enough silver for the aquamarine pick. It is now 30 aquamarine + 20 silver bars (ADR-021, amended).
State: `npm run check` green. Act III sim, 9 seeds: all 9 finish, median 333 min against a 390 target (inside ±15%, at the fast edge).
Next: M4 The Heart.
Questions for Tom: none.

## 2026-10-06 · UI polish (ADR-022)

Done: all ten items of the approved polish proposal. Cancel queued blocks by tapping or dragging over them, Esc or Clear queue; numbered queue with an order thread; ore floats at the shaft head; one-time tip cards and NEW pips; a banner for each new biome; edge arrows to pests, stalled miners and nearby verses; a depth ruler with biome bands; miner face brackets and stall marks; Village tabs; biome resource chips with rates and a tray; a one-button tool picker and hold ring on phones.
State: `npm run check` green (50 tests). Checked at 1280×800 and 390×844. No save change.
Next: M3-09 (Act III tail), then M4.
Questions for Tom: tip and banner wording is mine; edit freely.

## 2026-10-06 · M3 Drowned

Done: Act III. Water that settles and floods, pumps, the drowned town (Holloway under the water, four houses, Verses VI–VIII), the Singing Geodes with singing stone and crystal-ringed Verses IX–X, the Song-loom and ten charms, cave eels and shard golems, and Act III lines. In the spirit of ADR-020, Bram's pump crew moves pumps for you and Pell's rounds handle eels and golems. Save v5. ADR-021 moves the Halls' tools onto silver.
State: `npm run check` green (46 tests). Act III sim, 9 seeds, 10 h cap: 7 of 9 reach Act III end (282, 332, 351, 378, 448, 532, 590 min); 2 find Verses VI–VIII but never open the crystal around IX–X in time. Median 448 min against a 390 target, at the edge of ±15%. M3-09 stays open for that tail.
Next: Tom's polish request (cancelling queued blocks, popups, indicators, UI tidy), then M4.
Questions for Tom: none.

## 2026-10-06 · Juice pass (ADR-020)

Done: Tom said the game is good but does not cultivate dopamine, so the DangerouslyFunny findings went into Acts I and II. Helpers take over lighting, pests and supports for good. Homecoming makes the regain after a Cave-in fast. Verses pay bars and a permanent 5%. A whetstone means there is nearly always something to buy. Every purchase shows a toast with its jump, beating your best depth shakes the screen, and a "Held back by" chip names the bottleneck. Save v4.
State: `npm run check` green. Act I sim: first Cave-in 32.9 min (new target 30), 8 Echoes, longest wait with nothing to buy a median 185 s in the first 15 min. Act II median 2 h 50 min (was 3 h 54).
Next: carry this into M3 (a pump crew, Pell for eels and golems), then finish Act III balance.
Questions for Tom: is the faster pace right, or should Act II stay nearer 4 h?

## 2026-10-06 · M2 Glowroot

Done: Act II. The Kiln and bricks, the Lamp-works and Lumen, lanterns with upkeep and moths, supports and small collapses, rails, pick gates up to the Heartstone, Verses III–V in brick shrines, Old Wren, the full Echo tree (18 upgrades), Echo power, offline progress with a "While you were away" sheet, the phone bottom tray, and smooth lighting (Tom's request). Save v3. PR #3.

**Directions taken**

- **The bot found Act II was optional.** With everything built, it ignored lanterns and iron and hand-dug to 400 ft with a copper pick in two hours. ADR-017 is the fix: pick gates, verses in old brick that need an iron pick, and the Foreman digging by the light at the face below 150 ft.
- **A run's mountain is finite.** Once gated, the bot couldn't afford the gates, because each mountain holds only so much copper and iron. Rather than flood the map with ore, Act II prices came down and every Echo ever earned now speeds the village by 3%. Each cycle reaches a little further, which is what a prestige loop should feel like.
- **Lumen is a budget, not a meter.** Lanterns burn it constantly, and at zero they all go dark at once. Wren tells you so.
- **Collapses never trap anyone.** If a fall would cut a worker off from the sky, the roof holds after all.
- **Offline progress runs the real sim** in coarse steps, with pests held off, so what you come back to is exactly what the rules would have produced.
- **Smooth lighting (ADR-018):** light eases over a tenth of a second and blends at quarter-tile steps. Soft, but still pixel art.
- **Correction to M1:** the Act I bot never dug toward Verse I on purpose. It now chases the next verse once it has a pick; Act I targets are still all within ±15%.

Balance sim, Act I (9 seeds):

```
Milestone                    target   median   per seed
First bar smelted               ≤1m     0.5m    0.4   0.4   0.6   0.5   0.5   0.4   0.4   0.5   1.9 ✓
First miner hired                8m     8.9m    4.2   6.7   7.7   8.9   9.7   4.5  10.6  10.7  15.1 ✓
Verse I found                   10m     9.4m   12.8   4.9  13.4   2.8  14.2   6.9  14.1   9.4   3.1 ✓
150 ft                          20m    18.9m   18.9  18.3  17.0  20.1  23.5  18.3  18.2  22.3  26.5 ✓
First Cave-in available         45m    39.6m   39.1  51.8  39.6  46.9  49.9  28.9  34.5  61.9  31.4 ✓
Echoes at first Cave-in       6–10        8       8     8     8     8     8     8     8     9     8 ✓
```

Balance sim, Act II (9 seeds, playing through Cave-ins):

```
Glowroot cleared (Act II)      240m   233.0m  265.4 301.6 233.0 183.8 269.5 178.0 225.7 212.4 255.4 ✓
seed 1000: cave-ins at 54, 127 min · 400 ft 108.7 · Verse V 265.4 · cleared 265.4 · echoes ever 17 · pick 3 · lampworks 1 · collapses 5
seed 8919: cave-ins at 88, 148, 193, 233 min · 400 ft 134.6 · Verse V 301.6 · cleared 301.6 · echoes ever 35 · pick 3 · lampworks 1 · collapses 4
seed 16838: cave-ins at 57, 92, 134, 194 min · 400 ft 178.0 · Verse V 233.0 · cleared 233.0 · echoes ever 36 · pick 3 · lampworks 1 · collapses 13
seed 24757: cave-ins at 64, 118 min · 400 ft 152.6 · Verse V 183.8 · cleared 183.8 · echoes ever 17 · pick 3 · lampworks 2 · collapses 11
seed 32676: cave-ins at 39, 128, 158, 238 min · 400 ft 100.1 · Verse V 104.4 · cleared 269.5 · echoes ever 35 · pick 3 · lampworks 1 · collapses 4
seed 40595: cave-ins at 93 min · 400 ft  83.1 · Verse V 150.9 · cleared 178.0 · echoes ever 9 · pick 3 · lampworks 2 · collapses 1
seed 48514: cave-ins at 60, 110, 163 min · 400 ft 199.2 · Verse V 211.6 · cleared 225.7 · echoes ever 23 · pick 3 · lampworks 2 · collapses 3
seed 56433: cave-ins at 84, 149, 179 min · 400 ft 168.7 · Verse V 208.6 · cleared 212.4 · echoes ever 26 · pick 3 · lampworks 1 · collapses 16
seed 64352: cave-ins at 96, 157, 204 min · 400 ft 236.2 · Verse V 255.4 · cleared 255.4 · echoes ever 24 · pick 3 · lampworks 1 · collapses 6
```

State: `npm run check` green (40 tests), build green. Desktop and phone checked with an Act II save; draw time 1.4 ms.
Next: M3 Drowned (water, pumps, silver and aquamarine, eels, the drowned town, Verses VI–VIII).
Questions for Tom: is the Act II shape right (ADR-017)? The iron pick is now the key to the Glowroot verses.

## 2026-10-06 · M1 First Verse

Done: the whole Act I loop. Forge with recipes, picks, the Bunkhouse and miners, rope and winch haulage, torches, Vein Rush, burrow beetles, old chests, Verses I and II with Pell's and Bram's lines, the Cave-in, the Survey Book and the five Echo upgrades. Save v2 with a migration. PR #2.

**Directions taken**

- **The Survey Book starts with pages already filled in, in the Foreman's own hand.** It is the first hint that the village has done this before, and it costs nothing to build.
- **Reach.** The village only works rock that touches air connected to the sky (ADR-016). Sealed caves and their chests stay sealed until you dig in.
- **Miners choose their own faces**: exposed ore first, then rock with ore close behind it, then the shaft floor. No micromanagement, but torches decide how fast they go.
- **Pacing retune (ADR-015).** Canon asked for the first miner before the first bar, which can't happen. The sim also had the Cave-in at 14 minutes. Hand-mining is slower and copper richer now, and the targets for the first bar, first miner and 150 ft are revised. Question for Tom below.
- **The forge bug the sim found:** re-selecting the same recipe reset its progress, so a player tapping it would never get a bar.

Balance sim (9 seeds):

```
Milestone                    target   median   per seed
First bar smelted               ≤1m     0.5m    0.4   0.4   0.6   0.5   0.5   0.4   0.4   0.5   1.9 ✓
First miner hired                8m     8.9m    4.2   6.7   7.7   8.9   9.7   4.5  10.6  10.7  15.1 ✓
Verse I found                   10m     9.4m   29.6   4.9  16.2   2.8  15.1   6.9  17.1   9.4   3.1 ✓
150 ft                          20m    17.9m   17.4  17.9  17.1  15.5  23.5  16.4  19.7  21.7  20.8 ✓
First Cave-in available         45m    51.7m   54.1  61.4  38.8  41.7  52.6  29.1  49.5  51.7  63.1 ✓
Echoes at first Cave-in       6–10        8       9     8     8     9     8     8     8     8     8 ✓

Depth reached (ft): 308, 300, 300, 300, 324, 300, 300, 344, 300 · miners: 2, 2, 3, 2, 2, 2, 2, 1, 1

All pacing targets within ±15%.
```

State: `npm run check` green (29 tests), build green. Desktop and phone checked with a mid-game save.
Next: M2 Glowroot.
Questions for Tom: are 1, 8 and 20 minutes right for the first bar, first miner and 150 ft (ADR-015)?

---

## 2026-10-06 · M0 Bedrock, build journal

Tom asked to see the directions taken as the build goes, so each milestone entry now carries a short journal of the calls made and why.

**How I'm working**

- One branch and one draft PR per milestone (`m0/bedrock`, `m1/...`), with tickets as commits, instead of a branch per ticket. Building unattended, a PR per ticket would stack a dozen PRs waiting on review. (ADR-009, to write.)
- The roadmap's M0 tickets are followed for acceptance, but code is written with the later milestones in mind (state already has fields for miners, pests, verses and the Survey Book) so saves don't need a migration every milestone.

**Directions taken so far**

- **Engine:** no game engine. Canvas 2D with Preact only for menus and HUD, as the dev bible says. The world is 64 tiles wide and 416 deep (to the floor of the Hollow Heart), stored as flat typed arrays in 32×32 chunks.
- **One world, generated whole.** The full mountain, all seven biomes, is generated from the seed at start (about 27k tiles, which takes milliseconds). Saves store only the tiles you changed. This keeps the drowned village, the geodes and the Hollow Heart as hand-shaped set pieces rather than pure noise.
- **Story placement:** the 12 verse carvings are placed deliberately. I and II sit beside the shaft in Topsoil, VI to VIII hang on the back walls of the drowned houses, and XII is in the Hollow Heart. Each is bedded in solid stone so you find it by digging, never by falling into it.
- **Lighting:** two channels (warm and cool) by flood fill, matching the design bible's torch strip exactly (1.00, 0.92, 0.83...). Torches gutter to 0.6 below 150 ft, so lanterns and Lumen in Act II feel needed rather than optional.
- **Art pipeline change:** sprites stay as text grids, but they are turned into canvases at runtime instead of a build-time atlas file. Tile textures are generated from each material's three-colour ramp with four variants. Fewer moving parts and nothing to rebuild. (ADR-011, to write; `build:atlas` drops from the commands.)
- **Art so far:** 67 sprites pass the lint: all ores, the Foreman and miners, Pell, Bram and Old Wren, five pests, every pick, bar and ore chunk, placeables (torch, lantern, support, pump, vent, chest, rope), and the village buildings, including an animated headframe and Song-loom.
- **Digging feel:** tap a tile to queue it; drag from a tile to queue a whole path. Hand-mining ignores light (the Foreman carries his own lamp); miners will not, which is what makes torches matter.
- **Saves:** JSON with big numbers tagged, compressed with lz-string, versioned from v1 with a fixture test. Missing fields are filled from a new game, so adding things later doesn't break old saves.

**Renderer and input (later the same day)**

- Chunks are cached to offscreen canvases and redrawn only when a tile in them changes. Light is drawn as one block per tile, Terraria style, with the warm and cool tints from canon §7.
- The Foreman carries a lamp glow (render only, ADR-010). Without it the first dig felt like digging blind.
- Browser testing caught a real bug: big numbers were saved as plain strings and came back broken after a reload. Fixed, with a test that checks the type survives.
- Draw time is about 1.5 ms a frame with the CPU throttled 4×, well inside the 8 ms budget.

State: `npm run check` green (19 tests), build green. M0-01 to M0-06 and M0-08 ticked. M0-07 is missing the walk cycle and two item sprites (Parking lot).
Next: M1 First Verse, on a stacked branch (ADR-009).
Questions for Tom: none.

---

## 2026-10-06 · Pre-production

Done: concept chosen (ADR-001). The design bible, the development bible (`CLAUDE.md` and `docs/`), canon values and the M0/M1 roadmap are written.
State: no code yet.
Next: M0-01 Repo scaffold.
Questions for Tom: where should the repo live? See the open questions in `decisions.md`.
