# Undersong: instructions for Claude

Undersong is a browser incremental mining game. It is shown in side-on pixel cross-section, in the style of Terraria. A village digs toward a song under the mountain. Prestige is the **Cave-in**: the village forgets, and the player keeps Echoes and verses.

This file is the entry point. Read it at the start of every session, and do not skip the session protocol.

## Source-of-truth hierarchy

When two sources disagree, the higher one wins. If you find a conflict, flag it instead of picking quietly.

1. **Tom's latest instruction in chat.**
2. `docs/decisions.md`: settled decisions (ADRs). These are never re-litigated silently.
3. `docs/canon.md`: the numbers, names, palette and formulas. **Never invent a value that belongs here.**
4. `docs/dev-bible.md`: how the code is built (architecture, conventions, testing).
5. `docs/roadmap.md`: what to build and in what order, with acceptance criteria.
6. `docs/design-bible.html`: the original design spec (the why, the story and the art direction).
7. Your own judgement. Use it only for what none of the above covers, and log the call in `docs/decisions.md`.

## Session protocol

**Start of session**
1. Read this file, then `docs/progress.md` (the last entry tells you where things stand).
2. Open `docs/roadmap.md` and find the **first unchecked ticket in the current milestone**. That is the work, unless Tom said otherwise.
3. Read that ticket's acceptance criteria and "Out of scope" list before writing code.
4. Run `npm run check`. If it is red before you have touched anything, fixing that comes first.

**During the session**
- Work on one ticket at a time, with one branch per ticket: `m{N}/{ticket-id}-{slug}`, for example `m0/m0-03-tile-renderer`.
- If you notice something worth doing that isn't in the ticket, **add it to the roadmap's Parking lot** and do not do it now.
- If a ticket turns out wrong or too big, stop. Split or rewrite it in `roadmap.md` and say so in your reply.

**End of session**
1. `npm run check` must be green: typecheck, lint, tests and a sprite lint.
2. Tick the ticket in `roadmap.md` only if **every** acceptance criterion is met, and record its PR.
3. Add a dated entry to the top of `docs/progress.md`: what changed, what's next, and any open questions for Tom.
4. If you made a design or architecture call, add an ADR to `docs/decisions.md`.

## Golden rules

1. **The simulation is pure.** `src/sim/**` never touches the DOM, canvas, `Date.now()`, `Math.random()` or `localStorage`. Time and RNG are passed in.
2. **Numbers live in data, not code.** Costs, rates, hardness values and thresholds go in `src/data/*.ts` and are mirrored in `canon.md`. A magic number in sim code is a bug.
3. **Big numbers use `Decimal`** (break_eternity.js) for every resource, cost and rate. Plain `number` is only for tile coordinates, indices and render maths.
4. **Pixel art follows the rules in `dev-bible.md`.** It uses master palette colours only, integer scaling only and no anti-aliasing. `npm run lint:sprites` enforces this.
5. **Every save change is versioned**, with a bumped `SAVE_VERSION` and a migration plus a test. Players never lose a save.
6. **Story text lives in `src/story/*.ts`**, never inline in UI code. Verse wording comes from `canon.md`; never write a new verse unless the ticket asks for one.
7. **No new dependencies** without an ADR. The approved list is in `dev-bible.md`.
8. **Stay in scope.** A ticket's "Out of scope" list is binding.
9. **Both layouts.** Any UI change is checked at 1280×800 desktop and 390×844 phone before it counts as done.
10. **Report honestly.** If something is stubbed, skipped or failing, say so in the PR and in `progress.md`.

## Commands

```bash
npm run dev            # Vite dev server with sprite hot reload
npm run check          # typecheck + lint + test + lint:sprites  (must be green to finish)
npm run test           # Vitest
npm run lint:sprites   # palette, size and naming checks on assets/sprites
npm run sim -- --until=first-cavein   # headless balance sim, prints time-to-milestone
npm run sim -- --until=act2 --minutes=480   # plays on through Cave-ins to the end of Act II
npm run sim -- --until=first-cavein --strict   # exits non-zero if a target misses ±15% (CI runs this)
npm run build          # production build
```

## Map

```
src/sim/      pure game rules: economy, miners, logistics, prestige, offline
src/world/    chunks, generator, lighting, water, heat (pure data + algorithms)
src/render/   canvas: tiles, sprites, particles, camera (reads state, never writes it)
src/ui/       Preact panels, HUD, Survey Book (dispatches actions, never mutates state)
src/story/    verses, village lines, triggers
src/save/     serialise, migrate, offline catch-up
src/data/     every tunable number and definition
assets/sprites/  *.sprite text grids + palette.json
tools/        lint-sprites, balance-sim, make-fixture, art/ (Python that drew the sprites)
docs/         canon, dev bible, roadmap, decisions, progress, design bible
```
