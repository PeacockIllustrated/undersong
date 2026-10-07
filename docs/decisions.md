# Decision log

These are settled decisions. Don't reverse one quietly. To change one, add a new ADR that supersedes it and say so to Tom. New entries go at the bottom.

Format: **ADR-NNN · Title** · date · status (Accepted / Superseded by ADR-x). Each entry gives the context, the decision and its consequences.

---

**ADR-001 · Concept: Undersong** · 2026-10-06 · Accepted
Context: three directions were pitched: Undersong (pixel), Ministry of Weather (Bauhaus vector) and The Long Signal (generative line art).
Decision: Tom chose Undersong.
Consequences: the art is pixel art in the Terraria tradition, and the story is told through twelve verses.

**ADR-002 · Platform: browser first, mobile ready** · 2026-10-06 · Accepted
Decision: desktop and browser are the main target, with real phone portrait layouts from M2. There are no native builds for now.
Consequences: every UI ticket is checked at 1280×800 and 390×844.

**ADR-003 · Stack: TypeScript, Vite, Canvas 2D and Preact** · 2026-10-06 · Accepted
Context: a game engine (Phaser, PixiJS) was considered. The game is a tile grid with an overlay UI, and Canvas 2D with chunk caching is enough. It also keeps the bundle small and the code easy for Claude to reason about.
Decision: no game engine. Canvas 2D for the world and Preact for the UI.
Consequences: we own the renderer and camera. If the performance budgets in dev-bible §7 can't be met, revisit with an ADR to move to PixiJS.

**ADR-004 · Big numbers from day one** · 2026-10-06 · Accepted
Decision: every resource, cost and rate uses `Decimal` from break_eternity.js.
Consequences: there's slightly more code early on, but no migration later when prestige numbers grow.

**ADR-005 · Pure, deterministic simulation** · 2026-10-06 · Accepted
Decision: `src/sim` and `src/world` are pure, and the RNG and time are injected.
Consequences: balance can be simulated headlessly, offline catch-up can be tested and bugs can be replayed.

**ADR-006 · Sprites as text grids** · 2026-10-06 · Accepted
Decision: all art is authored as `.sprite` text files using the 32-colour master palette, then built into an atlas.
Consequences: Claude can write, review and diff the art. A lint enforces palette consistency. No binary art files are kept in the repo apart from the generated atlas.

**ADR-007 · One tile is 4 ft** · 2026-10-06 · Accepted
Decision: depth readouts use 4 ft per tile. Biome depth bands are in canon §2.
Consequences: the Hollow Heart starts around tile 350, which chunked storage handles easily.

**ADR-008 · Pests are tap-to-clear, not combat** · 2026-10-06 · Provisional
Context: Tom hasn't decided how deep combat should go yet.
Decision: until he does, pests stall miners in the dark and are removed with a tap. There's no health, weapons or damage.
Consequences: if Tom wants real combat, it becomes a new milestone-sized epic with its own ADR.

**ADR-009 · One branch and PR per milestone** · 2026-10-06 · Accepted
Context: Tom asked for the whole game to be built unattended. A branch and PR per ticket (CLAUDE.md) would stack a dozen PRs waiting on review.
Decision: each milestone is one branch (`m0/bedrock`, `m1/first-verse`, ...) and one draft PR to `main`, with tickets as commits. The next milestone branches from the previous one, so PRs stack.
Consequences: fewer, bigger reviews. The roadmap records the milestone PR against every ticket in it.

**ADR-010 · The Foreman's lamp** · 2026-10-06 · Accepted
Decision: hand-mining ignores the light factor (canon §4.5 applies to miners only). The renderer draws a soft warm glow around the Foreman (`LIGHT.foremanLamp`, 0.9) that never enters the sim.
Consequences: the player can always see where they dig. Darkness stays a village problem (miners slow down), which is what makes torches and Lumen matter.

**ADR-011 · Runtime sprite atlas and procedural tiles** · 2026-10-06 · Accepted (amends ADR-006)
Decision: `.sprite` files are parsed in the browser at startup into one small canvas per frame (Vite imports them as raw text). There is no `build:atlas` step or checked-in atlas PNG. Tile textures are generated from each material's three-colour ramp (4 variants each), with ore overlays from sprites. Props may be up to 64×48 (canon §6.3).
Consequences: no generated binaries in the repo and nothing to rebuild after editing art. Startup parses about 70 small files, which takes a few milliseconds.

**ADR-012 · tsx for tools** · 2026-10-06 · Accepted
Decision: repo tools (`lint-sprites`, `balance-sim`, `make-fixture`) are TypeScript run with `tsx`, sharing code with `src/`.
Consequences: one language; tools can import the real sim and data.

**ADR-013 · Torches gutter below 150 ft** · 2026-10-06 · Accepted
Decision: a torch gives 1.0 in Topsoil & Stone and 0.6 from Glowroot down (`LIGHT.torchDeep`). Lanterns give 1.5 at a Lumen upkeep.
Consequences: Act II's Lumen economy has a reason to exist. Canon §7 updated.

**ADR-014 · Dig input** · 2026-10-06 · Accepted
Decision: a tap queues one tile. With a mouse, dragging from a diggable tile queues a 4-connected path and dragging from air pans. On touch, a quick drag pans and press-and-hold then drag draws a dig path. The wheel and WASD/arrow keys scroll.
Consequences: digging a long tunnel is one gesture on every device.

**ADR-015 · Act I pacing retune** · 2026-10-06 · Accepted (Tom may override)
Context: canon §5 asked for the first miner (15 copper bars) at 2 min but the first bar at 5 min, which can't both be true. The first sim runs also had the Cave-in at 14 min.
Decision: hand-mining constant 2.5 → 1.15, stone hardness 3 → 4, copper and tin ore drop 2 each, Verse I placed a little shallower and closer to the shaft. Targets for the first bar, first miner and 150 ft are revised to what feels right in play (1, 8 and 20 min). Verse I at 10 min and the Cave-in at 45 min stay.
Consequences: `npm run sim -- --until=first-cavein` lands Verse I, the Cave-in and Echoes within ±15% (see progress.md). The first-miner time still swings by seed (4–15 min) because ore near the shaft varies.

**ADR-016 · Reach** · 2026-10-06 · Accepted
Decision: the village can only work rock that touches air connected to the sky (a flood fill, cached until a tile changes). Sealed caves stay sealed until you dig into them, and chests in them stay out of reach.
Consequences: the Foreman can't dig from inside the rock, and miners can't teleport into a cave.

**ADR-017 · Act II gating and the Echo curve** · 2026-10-06 · Accepted (Tom may override)
Context: with Act II built, the balance bot cleared the Glowroot in about two hours by hand-digging the shaft with a copper pick, ignoring the Lamp-works, lanterns and iron entirely. Then, with gates added, it could not afford them, because a run's copper and iron are finite.
Decision:

- Pick gates (canon §8.1): slate needs a copper pick, iron ore bronze, silver and old brick iron, and so on down.
- Verses III–V sit inside 3×3 old brick shrines, so the Glowroot verses need an iron pick.
- From 150 ft down the Foreman digs by the light at the face, like the miners (amends ADR-010; his lamp stays render-only). Torches still gutter to 0.6 there (ADR-013), so lanterns are the way to dig at full speed.
- More copper and some tin in the Glowroot (canon §8.2); iron ore drops 2.
- Act II prices set low enough to reach in a run: Lamp-works 8 iron, iron pick 15 iron, lantern 1 iron + 8 Lumen.
- Echo power: every Echo ever earned speeds every worker by 3% (canon §4.11). This is what makes each cycle reach further.
- "Glowroot cleared" means 400 ft reached and Verses III–V known.
  Consequences: Act I is unchanged in the sim (all within ±15%). Act II median is 3.9 h against the 4 h target, over 9 seeds and 2–7 Cave-ins each (`npm run sim -- --until=act2 --minutes=480`). Runs are now shaped by what a run's mountain holds, which makes the Cave-in a real decision.

**ADR-018 · Smooth lighting** · 2026-10-06 · Accepted (Tom asked for it)
Decision: the renderer eases each tile's displayed light toward the sim's value (about 0.1 s), then samples it bilinearly between tile centres at 4×4 blocks per tile. The Foreman's lamp is also computed per block. The sim's light grid and rules (canon §7) are unchanged.
Consequences: light falls off in soft quarter-tile steps instead of whole-tile squares, and lanterns and torches fade in and out. Still blocky enough to read as pixel art. Draw time measured 1.4 ms a frame at 1280×800.

**ADR-019 · Offline progress** · 2026-10-06 · Accepted
Decision: on load, and when a background tab comes back, the sim runs the credited time (canon §4.8) in at most 1,200 coarse steps of at least 5 s. Pests, moths and collapses are held off while away. A "While you were away" sheet lists what came up the shaft.
Consequences: eight hours away costs about two seconds to catch up on a laptop. Long steps waste a little of each tile's work, which reads as the efficiency penalty anyway.

**ADR-020 · The juice pass** · 2026-10-06 · Accepted (from Tom’s note that the game is good but does not cultivate dopamine)
Context: the DangerouslyFunny taste report (`/mnt/project-files/research/dangerouslyfunny-taste-report.md`) found the player wants something to buy at all times, big readable jumps, automation soon after a chore appears, no upkeep chores, no unexplained upgrades and a fast regain after a prestige.
Decision:

- **Helpers** (canon §14) automate the three chores Act I and II invented: lighting faces, tapping pests and placing supports. Each is bought once and survives the Cave-in.
- **Homecoming** (canon §4.12): after a Cave-in the village runs ×3 until 60% of your best depth, so the regain takes minutes, not most of a run.
- **Verses feel like loot** (canon §4.13): each pays a cache of bars and a permanent 5% to all work, shown on the verse card.
- **Whetstone** (canon §4.14): a cheap, repeatable copper sink so there is nearly always something to buy.
- **Feedback** (canon §14.1): purchase toasts with the multiplier, record-depth shake, a "Held back by" chip, and glowing buttons when something is affordable. The Survey Book shows what a Cave-in pays against last time and what it buys.
- Pell’s Hum moves to the front of the Memory branch at 2 Echoes, so the first Cave-in buys something useful straight away.
- Pacing targets move to match the faster game: 150 ft 17 min, first Cave-in 30 min, Glowroot cleared 2 h 50 min.
  Consequences: Act I 9-seed sim: first Cave-in 32.9 min, 8 Echoes, the longest wait with nothing to buy in the first 15 minutes is a median 185 s. Act II median 2 h 50 min (was 3 h 54). Save v4. Acts III onward will add a helper for each new chore (pumps, eels and golems) when they are built.

**ADR-021 · Act III economy** · 2026-10-06 · Accepted
Context: the balance bot stalled at 700 ft in every run. Iron comes from the Glowroot, and by the Halls it had all gone on pumps and rails, so the silver pick (then 40 silver + 20 iron) never came.
Decision:

- The Halls' tools are priced in silver, which the Halls have plenty of: silver pick 40 silver bars; aquamarine pick 20 aquamarine + 35 silver; pump 4 silver + 2 iron. Aquamarine drops 2.
- Rails are charged for at most 10 lots of 10 tiles (80 iron), so a village deep in the Halls can still lay them.
- Singing stone has hardness 14, between iron ore and basalt, so the Geodes are a real climb.
- Act III end is 1000 ft reached with Verses VI–X known. Its target moves from 9 h to 6 h 30, in line with the faster game after ADR-020.
- Bram's pump crew (canon §14) takes the pump chore off the player, like the other helpers.
  Consequences: 7 of 9 sim seeds reach Act III end inside 10 h, median 448 min against 390. Two seeds stall at the crystal rings; the tail is an open item (M3-09).
  Amended for M3-09: the two stalled seeds sat at 1000 ft with plenty of aquamarine and about 30 silver bars, short of the 35 the aquamarine pick wanted, because the Geodes give little silver. The aquamarine pick is now 30 aquamarine + 20 silver bars. All 9 seeds finish (199 to 382 min), median 333 min against 390, inside ±15%.

**ADR-022 · UI polish pass** · 2026-10-06 · Accepted
Context: Tom asked for polish: cancelling queued blocks, better UI, more popups and indicators. He approved the proposal artifact (roadmap P-01..10).
Decision:

- Queued tiles can be taken back out (an `unqueue` action; tapping a queued tile with Dig does it too). Esc and a Clear queue chip stop everything.
- "Seen" marks (tips, opened Village tabs, tools first placed) live in `story.ever` as `tip:`, `tab:` and `used:` keys. That list already survives a Cave-in and is free-form, so there is no save change. A `note` action accepts only `tip:` and `tab:` keys.
- Tip copy lives in `src/story/tips.ts`; biome banner lines in `src/story/biomes.ts`. Depth-ruler band colours are master palette entries in `src/data/biomes.ts`.
- Overlays (tips, edge arrows, ruler) hide while a sheet is open, and a tip waits behind any story event, so two cards never stack.
  Consequences: no balance or save change. Tip and banner wording is Claude's and open to Tom's edits.

**ADR-023 · Act IV: heat, the ending, Endless Depth and New Song+** · 2026-10-06 · Accepted
Context: M4 needs the Ember Deep's heat, the Hollow Heart and both endings. The design bible names the systems but not how they work.
Decision:

- Heat is not simulated over time. It is worked out for a tile from depth and the ember ore and heartstone near it, minus vents and water, and cached until the mine changes (canon §15). It is cheap, needs nothing saved, and is the same every time for the same mine.
- Too hot means miners won't take the face at all, so they move to cooler work and "Held back by: Heat" names it. The Foreman is only slowed (×0.3), so a player is never locked out.
- Water cools. A player who floods a hot gallery on purpose is rewarded, which ties Act IV to Act III.
- Wren's cold lamps (6 gold + 20 bricks) take the vent chore away, in line with ADR-020.
- Act IV's tools are priced in what the Deep gives. The crystal pick costs 80 crystal and nothing else, since the Geodes give little silver and no aquamarine, the same lesson as M3-09. Gold ore drops 3. Heartstone needs the Heart pick, which is made from the Deep (60 ember ore + 50 gold), so Verse XII waits for the best pick in the game.
- Act IV rock is twice as hard as first drafted (basalt 40, ember ore 64, gold ore 56, heartrock 52, heartstone 120). With the bot able to reach Verse XII, Act IV took only 1.5 to 2.5 hours; the design bible gives it five.
- Amended after an 8-seed run: at 80 ember + 80 gold the Heart pick was out of reach for most villages. They ran out of gold near 1400 ft, stalled and caved in, and the ending slipped past 15 hours. At 60 + 50 every seed reaches it. To keep Act IV long enough without a hard wall, the Deep's rock is half again as hard (basalt 60, ember ore 96, gold ore 84, heartrock 78, heartstone 180). Ending, 8 seeds: 507, 530, 655, 691, 729, 739, 829, 838 min, median 710 against 690.
- Both endings close the cycle like a Cave-in, paying Echoes. Sealing sets Endless Depth: the floor of the Heart opens 64 rows at a time. Singing starts New Song+: each song sung adds 50% to all later Echo gains.
- "Remixed verses" (design bible) means each verse comes back sung, with its two lines the other way round. Canon verse text is never rewritten.
- The ending choice is offered every run in which Verse XII is found, so a player can take the other ending later.
- The ending target moves from 14 h to 11 h 30. Act IV keeps the five hours the design bible gives it, after Act III's new end at 6 h 30 (ADR-021).
  Consequences: no save change (`ending`, `ngPlus` and `endlessRows` were already in the state). The ending and scene wording is Claude's and open to Tom's edits.

**ADR-026 · Offline catch-up that pays in full, and pacing as a CI gate** · 2026-10-06 · Accepted (from Tom's go-ahead on the code review)
Context: a review of main found that coarse catch-up steps (12 to 36 s) let each miner break at most one tile per step and threw the leftover work away, so 8 h away paid about two thirds of what real time would (626 tiles against 927). Coming back after 8 h also froze the page for 3 to 9 s, 84% of it in `chooseFace` scanning the whole grid for every miner. The balance sim never failed anything, so a pacing regression could merge silently.
Decision:

- A step of at least `COARSE_STEP_S` (0.5 s) is a catch-up step. In one, a miner or the Foreman that finishes a tile spends the time left over on its next face. Live play (100 ms ticks) is untouched: both balance sims give exactly the same output as before.
- The reach build also collects the frontier (every solid tile beside the reach), and the faces a miner would consider are cached per pick tier until the mine changes. `chooseFace` keeps its scoring and its row-by-row tie-break. 8 h with 40 miners now catches up in about 1 s.
- Absences under a minute (canon §4.8) now play on at full speed with no summary, instead of being lost. A phone user who glances at a message no longer loses that time.
- `npm run sim -- --strict` exits non-zero when a target misses by more than ±15%. CI runs the Act I sim strictly on every PR (it is deterministic and takes seconds); a nightly workflow runs Act II, Act III and the ending.
  Consequences: offline returns pay what the canon formula promises, which is more than before; M5-05's balance pass should look at it. No save change.

**ADR-027 · Sound** · 2026-10-06 · Accepted (Tom: sound as the next quality-of-life update)
Context: the game had no audio at all. The taste report's biggest asks are constant feedback and readable jumps, and a game called Undersong should be heard.
Decision:

- Every sound is synthesised with Web Audio from small recipes in `src/data/sounds.ts` (tones and filtered noise with an envelope). No audio files and no new dependency.
- Sounds follow sim events, the way the renderer's effects do, and never touch the sim. The Foreman is always heard; miners, and pests turning up, only when they are on screen. Sounds are panned by where they happen.
- The pick strikes in time with the Foreman's swing while a face is being worked, so a long dig is never silent. Ore chimes into the pack, a step higher for each link of a Vein Rush, up to an octave.
- Each material family has its own crunch: soft earth, stone, ore with a glint, and ringing crystal.
- A verse plays the Undersong: one note per verse (canon §16), the song so far up to the verse just found. The tune grows as the player finds more of it.
- A low drone, "the hum", follows the biome the Foreman stands in and deepens with depth. Holloway on the surface is quiet.
- Every cue has a minimum gap, and everything runs through a soft limiter, so a busy mine never turns into noise.
- Settings get Sound and The hum rows (Off, Low, Medium, High), saved with the other settings. M mutes and unmutes. Audio starts on the first touch or key (browsers require it) and is suspended while the tab is hidden.
  Consequences: no save or balance change. The sound design is mine and open to Tom's ear; every number is in `src/data/sounds.ts`.

---

## Open questions for Tom

- Business model: free on the web, premium, or a demo plus a paid version.
- How deep combat goes (see ADR-008).
- Act I pacing targets (ADR-015): are 1, 8 and 20 min right for the first bar, first miner and 150 ft?
- Act II gating (ADR-017): pick gates and brick shrines make the iron pick the key to the Glowroot verses. Is that the shape you want?
- The final name.

**ADR-024 · Settings and accessibility** · 2026-10-06 · Accepted
Context: M5 asks for settings and accessibility: reduced motion, text scale, and light shown by more than colour. Sound has moved to its own quality-of-life update, done in another thread, so it is not part of this.
Decision:

- Settings live in `src/settings.ts` under their own localStorage key (`undersong.settings`), apart from the save. Import, export, a Cave-in and Start over never change them, and the save version is untouched. The sim never reads them; the renderer and UI do.
- Motion has three choices: Auto follows the device's reduced-motion setting, Full and Reduced override it. Reduced cuts every CSS animation and transition to its end state, and stops screen shake.
- Text size is Normal, Large (1.15×) or Larger (1.3×), applied to every font size through one CSS variable, so layouts grow with the text rather than being zoomed.
- Shape marks are on by default. A face too dark for full speed (light under `PESTS.darkBelow`) gets a crescent moon over it while a miner works it. Rock too hot to work gets a dark badge with heat waves. Until now both were shown only by colour.
- Numbers can be short (1.5M) or scientific (1.50e6), which incremental players often prefer.
- The sound work adds its volume and mute rows to the same Settings panel.

**ADR-025 · Achievements** · 2026-10-06 · Accepted
Context: M5 asks for achievements. They should give the player something to aim at across cycles without adding a new save field while the offline work is changing the sim in parallel.
Decision:

- Eighteen badges, thresholds in `src/data/achievements.ts`, names and wording in `src/story/achievements.ts`. They pay nothing: no balance change, so the pacing targets stand.
- Each is checked about once a second and, once earned, stored in `story.ever` as `ach:<id>`. That list already survives a Cave-in and is already in the save, so `SAVE_VERSION` stays at 5. An older save earns what it already qualifies for on its first load.
- The Survey Book lists every achievement, with locked ones showing what earns them, so they double as goals. A toast announces each one; several earned together share one toast.

## ADR-028 · How the balance sim measures Act III

**Context.** In the M5-05 pass, 2 of 9 Act III runs never finished. Both were bot faults: Act III end used this run's depth (`maxDepthD`), which a Cave-in resets, while the Act IV bot already used the best depth ever (`bestDepthD`); and the bot stopped mining toward the aquamarine pick at a stale 20-aquamarine threshold, below its real cost.
**Decision.** Act III ends when 1000 ft has ever been reached and Verses VI to X are known, matching `inAct4`. The bot keeps mining ore while it can't yet pay for the aquamarine pick, read from `nextPick`.
**Result.** Act III median 341 min (target 390), all 9 seeds finish; ending median 659 min from 7 seeds (target 690). No game numbers changed.


## ADR-029 · Holloway above: the surface only adds

**Context.** Tom felt the overworld was missing something and asked for a farmer whose crops boost the miners and a tree farm. He approved the Holloway Above proposal (https://claude.ai/artifact/VPksRKJCXFApnzqmuqQVgT) as M6, with three calls left to defaults: the villagers are Tansy and Rook, trees survive the Cave-in, and costs are retuned so the pacing targets hold.
**Decision.**
- Two new `Decimal` resources, barley and timber, live in the village (never hauled). Numbers are in `src/data/surface.ts` and canon §17.
- The surface can only speed the mine: meals and cottages multiply miners, porridge multiplies hand-mining, the hearth multiplies forge speed, a feast multiplies the whole village. Nothing decays, spoils or penalises neglect.
- Fields, meals, hearth, cottages and the bell reset on a Cave-in like the rest of the village. Trees are kept and count the Cave-ins they stand through, so the woodlot is the one thing on the surface that grows across cycles. Elders' roots are worked out from the trees on load (`rootTiles`), so nothing about them is saved.
- Tansy's hands and Rook's axe follow ADR-020. Rook's axe leaves trees that have stood through a Cave-in, so elders form without the player having to guard them.
- Pit props: a support costs timber instead of bricks whenever timber is the more plentiful, so the Kiln recipe never becomes a choice the player has to manage.
- Save v6 adds `surface`. `migrate()` now also fills any resource key a save is missing, which covers barley and timber and any resource added later.
- The act crops (M6-07) and the tally board (rest of M6-06) are left for a follow-up PR.
- Balance: uncapped meals made the ending about 35% faster (a meals-off run took one seed from 454 to 790 min), because long final runs bought many levels. Meals, the hearth and cottages are now capped per run (3, 2 and 5 levels). Act III sat at −12.6% before M6, so any surface speed pushed it out of band; slate goes from hardness 6 to 7 and singing stone from 14 to 17 to make room.
**Result.** Act I strict-green (First Cave-in 31.6 min). Act III median 359 min (target 390), ending about 689 (target 690), 9 seeds each.

## ADR-030 · Act crops are plots turned over, tied to each act's system

**Context.** The Holloway Above proposal gave each act a crop: glowcaps in a root cellar (II), cress watered by the pumps (III), firepeppers warmed by ember ore (IV). The field row east of the shaft has no room for new beds, and the proposal called paddies "flooded plots".
**Decision.**
- Paddies and hot-beds are barley plots turned over (`Plot.crop`), so they share the field row and the 12-plot cap. The player trades barley they no longer need (its meals cap at 3) for the act's crop.
- Paddies are capped at 2 per pump placed, and paddies past that stand dry rather than wither (the surface only adds, ADR-029). Hot-beds wait while there is no ember ore, and each harvest burns 1.
- The cellar is drawn in the cross-section under the cookhouse, over the soil, and does not touch the tile grid.
- Cress and firepepper are new village resources. Save v7 adds soup and broth levels and the cellar state.
- Costs and caps are my own call, in `src/data/surface.ts` and canon §17.6. Pacing is checked after merge with the act3 and ending sims (the M6 working rule: ship, then tune).

## ADR-031 · Aiming on touch: a loupe, smart dig, and buzzes

**Context.** On a phone a tile is 32 CSS px and the finger hides it (Tom's report; Terraria answers this with an offset zoom box).
**Decision.**
- While a finger is on rock, a ×2 loupe shows above it with the aimed tile outlined in gold. Settings offer Aim on touch: Magnifier (default), Crosshair (aim 64 px above the finger) or Off. Lifting the finger off the edge of the view cancels.
- Smart dig (Settings, default on) snaps a finger's tap on plain rock to workable ore within 1 tile. A mouse is precise, so a click only snaps when the clicked rock can't be worked. Holding 600 ms on ore queues the whole visible vein. The ticket said a tool-bar toggle; it went in Settings beside Aim, because the phone tray has no room.
- Vibration (Settings, default on) buzzes on the hold, on the Foreman's breaks and on ore, one buzz a frame at most.

## ADR-032 · Zoom in whole steps, and the Mountain view as a flat map

**Context.** M7-05 asks for pinch zoom and a view of the whole cross-section, with integer scaling only. The world is 64 tiles wide and over 300 deep by Act IV, so no whole-number sprite scale shows it all on any screen.
**Decision.**
- Zoom steps through whole art scales (phone ×1 to ×3, desktop ×2 to ×4), keeping the centre still. The tile chunk caches are in art pixels, so zooming costs no re-render.
- The Mountain view is a different drawing, not a smaller one: one flat master-palette colour per tile (rock faces the village has opened in their own colour, unopened rock all one slate, dug space dark, water blue, workers as gold and teal dots), scaled up by whole device pixels with smoothing off. Biome names mark where each band starts. Only opened faces show their ore, so the map gives nothing away.
- A tap on the map goes there, close up. Esc, + or a pinch in also leave it.
- Measured with 40 miners in headless Chromium: draw time p95 1.0 ms at the default zoom, 2.5 ms at the farthest, 0.7 ms in the Mountain view (budget 8 ms). That machine is not a mid-range phone, so this is an indication rather than proof.

## ADR-033 · Payoffs: a cheaper start, Vein Break, and a shop you read at a glance

**Context.** M8 asks for something to buy at almost every moment of Act I, and for every reward to be something you see. The sim found the first 15 minutes had a median longest wait of about 185 s with nothing affordable. Copper bars come in at 1–3 a minute in Act I, and the bot was spending most of them on torches.
**Decision.**
- Economy (canon §4.14, §9): the first miner costs 12 copper bars (was 15), the whetstone `1 × 1.4^n` (was `2 × 1.45^n`), a torch craft makes 5 (was 3), and the copper pick costs 22 (was 10) so that it stays a goal rather than an instant buy. A steeper whetstone than 1.2 is needed: at 1.2 the whetstone keeps paying into Act III and the act ended 27% early.
- The balance bot buys like a player: helpers wait for the third miner, haul is bought when ore piles up underground, and buys on the surface (plots, meals, saplings) count as "something to buy". `--strict` now also fails when the median longest wait is over 90 s.
- Vein Break (canon §4.7.1): an ore tile broken by hand at the ×5 Rush cap breaks the rest of the vein (up to 12 tiles, 90 ms apart). It is a reward for a hand-mining chain, so it never fires offline and miners never trigger it.
- The shop (canon §19): ×1 / ×10 / Max applies to the repeatable buys only; one-off purchases stay single. "Ready in" is read from what the HUD sees coming in, which is a UI estimate and not part of the sim. Prices sit inside the buttons, the short resource is red, affordable cards sort first and descriptions fold to one line. On a phone the Village takes the bottom half of the screen so the mine stays in view.
- The ore heap and bar stack are render-only and read `res`, so they cost nothing in the save.
- Alerts carry where their fix is (`Fix` in `src/ui/feedback.ts`): a Village card, scrolled to and lit, or a place in the mine. The haulage alert now compares ore a second with ore a second (it used to compare hardness with ore).
**Consequences.** The "≥3 miners at the first Cave-in" criterion is not met: the median is 2, and about 4 seeds in 9 reach 3. Getting there pulled the first Cave-in under its target, so the ticket was rewritten (see roadmap M8-01) rather than forcing it.

## ADR-034 · Memory: metalwork, a rehiring bunkhouse, a ghost, a ceremony and the Foreman's lead

**Context.** M9 asks that no act leaves the player more than 10 minutes with nothing to buy, and that the Cave-in feels like a payout. The probe in M7 planning found 83–157 minute dead stretches in Acts III and IV.
**Decision.**
- Metalwork (canon §20): one cheap repeatable buy for each of silver bars, crystal, ember ore and gold bars, like the whetstone, reset on a Cave-in. Growth is 1.6 (1.45 brought the ending in about 30% early on the first runs).
- Bunkhouse Roll is a Memory upgrade between Bram's Ledger and Old Shafts, so the rehire never fires in a first run.
- The ghost keeps one number a minute (at most 480), so the save grows by at most a few KB. `lastRun` and `runDepth` are save v8.
- The ceremony is UI only; the sim moves to the new run at once, as before. Its sound plays the notes of the verses learned this run, carried on the `caveIn` event.
- The Foreman's lead is ×1.25 inside 6 tiles, not the ticket's ×1.5 starting point: at ×1.5 together with metalwork, the ending came in around 520 minutes against 690.
- The balance bot buys metalwork from spare (at most 20% of holdings) and reports the longest wait per act. The 10-minute gate runs on Act II runs.
**Consequences.** Long-act sims stay noisy (±10% between runs of 9 seeds); see the M9 progress entry for the medians at merge.
