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

---

## Open questions for Tom

- Business model: free on the web, premium, or a demo plus a paid version.
- How deep combat goes (see ADR-008).
- Act I pacing targets (ADR-015): are 1, 8 and 20 min right for the first bar, first miner and 150 ft?
- Act II gating (ADR-017): pick gates and brick shrines make the iron pick the key to the Glowroot verses. Is that the shape you want?
- The final name.
