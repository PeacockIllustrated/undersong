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

---

## Open questions for Tom

- Where the code lives: a new GitHub repo is proposed.
- Business model: free on the web, premium, or a demo plus a paid version.
- How deep combat goes (see ADR-008).
- The final name.
