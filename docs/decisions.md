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
- Act IV's tools are priced in what the Deep gives. The crystal pick costs 80 crystal and nothing else, since the Geodes give little silver and no aquamarine, the same lesson as M3-09. Gold ore drops 3.
- Both endings close the cycle like a Cave-in, paying Echoes. Sealing sets Endless Depth: the floor of the Heart opens 64 rows at a time. Singing starts New Song+: each song sung adds 50% to all later Echo gains.
- "Remixed verses" (design bible) means each verse comes back sung, with its two lines the other way round. Canon verse text is never rewritten.
- The ending choice is offered every run in which Verse XII is found, so a player can take the other ending later.
Consequences: no save change (`ending`, `ngPlus` and `endlessRows` were already in the state). The ending and scene wording is Claude's and open to Tom's edits.

---

## Open questions for Tom

- Business model: free on the web, premium, or a demo plus a paid version.
- How deep combat goes (see ADR-008).
- Act I pacing targets (ADR-015): are 1, 8 and 20 min right for the first bar, first miner and 150 ft?
- Act II gating (ADR-017): pick gates and brick shrines make the iron pick the key to the Glowroot verses. Is that the shape you want?
- The final name.
