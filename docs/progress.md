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

## 2026-10-06 · M0 Bedrock (in progress), build journal
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
