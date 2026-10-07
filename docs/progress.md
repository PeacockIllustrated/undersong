# Progress log

Newest entry first. Add one at the end of every working session. Keep each entry short; the roadmap holds the detail.

```
## YYYY-MM-DD · ticket ID(s)
Done: what changed, with PR links.
State: is `npm run check` green? Is anything stubbed or known to be broken?
Next: the next ticket.
Questions for Tom: anything blocking or worth a decision (or "none").
```

## 2026-10-07 · Holloway & Co. (hybrid branch, playable build)
Done: Holloway & Co., the Undersong × Coal LLC hybrid, is playable at `/`, and Undersong moves to `/undersong.html`. You play the Foreman directly (WASD, mouse aim, hold to dig) to fill a rising daily coal quota before dusk. Nights are spent in the Company Store, and a missed quota is the Cave-in, which pays Echoes for the Survey Book. Touch controls are included. Docs are in `docs/hybrid/` (ADR-H001 to H007, hybrid canon). The new `ore-coal` sprite is in.
State: `npm run check` and `npm run smoke` are green, with 11 new sim tests. Played in Playwright at 1280×800 and 390×844 through title, day, dusk, night, buying, day 2, Cave-in, a new contract and pause. Deferred: bars and the forge, Foremen and Seams, and real art for the store icons (they borrow Undersong items).
Next: tune feel from Tom's play. Then M-H2: bars and the forge, and more relics.
Questions for Tom: does it feel enough like Coal LLC?

## 2026-10-07 · M13-08 (Walking, lamplight and lanterns)
Done: the Foreman and miners walk with a four-frame cycle, and miners ease between faces instead of jumping. The Foreman's lamp now spreads through open tiles and dims fast in rock, so it no longer shines through walls. The lantern is redrawn as a brass lantern on an iron bracket so it reads against dark rock.
State: `npm run check` is green. Render and art only; no save or sim change. Checked in Playwright at both sizes.
Next: the bot's torch plan is still parked (it moves balance-sim timings).
Questions for Tom: none.

## 2026-10-07 · M13-04 to M13-06 (Pin, ledger, Keep buying)
Done (ADR-042, canon §23, save v11):
- Pin: any Village buy has a pin. The pinned goal sits on the HUD with a bar for how much of its price is in hand and "ready in". Tapping it opens its card, even on another tab. One-off goals clear once bought and toast when they become affordable.
- Ledger: a Survey Book tab with time played, tiles dug (in all and this cycle), deepest ever, Cave-ins, fastest Cave-in, Echoes in all, chests and collapses. Each new page notes how long its run took.
- Keep buying: from the third run on, every repeatable buy has an Auto switch. It buys once a second while the price is at most 10% of what is in hand, with no toast, and the switches stay through Cave-ins.
State: `npm run check` is green. Save v11 has its migration, fixture and tests. Checked in Playwright at both sizes: pinning the copper pick puts it on the HUD, and tapping the chip opens the Village on the pick card. No overflow.
Next: the Parking lot polish (walk cycles, lamp glow through rock, the lantern sprite, the bot's torch plan).
Questions for Tom: none.

## 2026-10-07 · M13-07 (Panels that feel current)
Done: the Village, Survey Book and Menu are now one drawer (ADR-041). It is a side panel on desktop and a draggable bottom sheet on a phone, and the three panels are switched as tabs at its top. The tabs and the ×1/×10/Max toggle stay put while the cards scroll. The mine stays live beside the drawer, and the HUD moves over to make room. The Survey Book is split into six tabs and the Menu into four. Cards are tiles; buy buttons are list rows with the price on the right and a gold edge when you can afford them.
State: `npm run check` and `npm run smoke` are green. The smoke test now opens the Village and Survey drawers for every fixture at both sizes. Checked in Playwright: Esc closes; on a phone, dragging up gives full height and dragging down halves, then closes; no overflow.
Next: M13-04 pin a goal, M13-05 the ledger, M13-06 auto-buy.
Questions for Tom: none.

## 2026-10-07 · M13-01 to M13-03 (Quality of life, first batch)
Done: Tom asked for every QoL improvement; M13 is ticketed in the roadmap (seven tickets, the last one a panel redesign he asked for).
- Keys: V Village, B Survey Book, C cart, F follow, G mountain, 1–6 tools, ? key list (also a Keys page in the Menu). Tooltips name the key. Nothing fires while typing or with a modifier held.
- Hold to buy: holding any repeatable buy (miners, sharpening, metalwork, plots, saplings, meals, woodlot buys, torches) keeps buying, faster the longer it is held. The button captures the pointer, so it keeps going when the card shifts under the finger. Repeated toasts replace each other instead of queueing.
- Lately: a Menu page with the last 50 toasts, biome banners and achievements, newest first, with how long ago. Kept on the device, not in the save.
State: `npm run check` is green. Checked in Playwright at 1280×800 and 390×844: a 2 s hold hired 19 miners; a tap still buys once; no horizontal overflow.
Next: M13-04 pin a goal, M13-05 the ledger, M13-06 auto-buy, M13-07 the panel redesign.
Questions for Tom: none.

## 2026-10-07 · M12-05 (Enough aquamarine)
Done: while the village has the silver pick but less aquamarine than the aquamarine pick needs, every tinker's cart carries a crate, and it holds aquamarine instead of bars. The crate is named for it, and the bot takes it. No mountain changes, so old saves are untouched (ADR-040). Canon §21.1.
State: `npm run check` is green (144 tests). Act III, 9 seeds, 600 min: all finish, 140 to 240 min, median 182. Seed 48514 went from 306 to 238 min and no longer needs a fourth Cave-in. The slowest seed (24757, 240 min) does not stall at a gate; its third run just digs slowly. No village sits at the aquamarine gate any more.
Next: every planned ticket is built. The Parking lot holds what is left.
Questions for Tom: none.

## 2026-10-07 · M12-01 to M12-04 (Keep it)
Done:
- Saves: Copy save, Download save (a dated .txt), and Open a file or paste to import. Import checks the save, shows its cycle, depth, Echoes and verses, and replaces the game only after "Load this save". Plain JSON is accepted too.
- Installable: a web manifest, icons drawn at integer scale, and a hand-written service worker (ADR-038). Served from a subfolder, the built game took over, went offline, reloaded and booted.
- Layout smoke test: Playwright as a dev dependency (ADR-039). `npm run smoke` boots a new game and every save fixture at 1280×800 and 390×844; CI runs it after the build and keeps the screenshots. 22 boots clean.
- Sim coverage: the bot now buys plots when one costs half its copper, and keeps at least two barley plots when it floods paddies. The summary line prints plots, pumps, paddies, hot-beds, feasts rung and the bell's best.
State:
- `npm run check` is green.
- Act III, 9 seeds, 600 min: all finish, 140 to 306 min, median 182 against 390 (early, which ADR-035 allows).
- Paddies appear in 8 of 9 seeds (up to 3), pumps in all 9. Hot-beds never appear because the Act III run stops before the Ember Deep.
- Is 150 crops reachable in an ordinary run? Yes. The bell reached 150 and rang in 8 of 9 seeds (1 to 3 feasts each, and a second bell at 240 nearly filled twice). The ninth seed got to 128 in a short 140-minute session. Before this the bot held one plot, so the bell never rang.
- The slow Act III seeds: the two slowest (48514 at 306 min, 24757 at 240) both sat for 30 to 50 minutes in a mountain without enough aquamarine. The aquamarine pick needs 30 (15 tiles), and 4 of the 45 mountains these seeds dig (five cycles each) hold fewer than 15 aquamarine tiles in the Halls, so the village has to cave in to get a new mountain. That is the game, not the bot, so it is ticketed as M12-05.
Next: M12-05.
Questions for Tom: none.

## 2026-10-07 · M11-01 to M11-03 (Beyond the song)
Done:
- Endless Depth markers every 500 ft under the Heart (2,024 ft, 2,524 ft, …), drawn as a row of marker stones. Marker k pays 8 × 1.5^(k−1) Echoes and 40 × 1.5^(k−1) Gold bars, once ever.
- Deep picks past the Heart pick: each doubles pick power, one per marker reached this run, cost ×2 each time (crystal and gold). Forgotten in a Cave-in.
- Auto Cave-in in Settings once the ending has been reached: caves in after 3 min with no rise in the Echoes on offer, never offline or ahead of the ending's choice; the Survey Book page says "by itself".
- New Song+ keys (M11-03 split into 03a sim and 03b UI): wet year, hot year, rich veins, hard year. The sing choice names the next key; the Survey Book names the current one.
- Save v10 with migration and fixture. Canon §22, ADR-037.
State:
- `npm run check` is green (140 tests). Both layouts checked for the choice card, the deep pick button and the setting; no overflow.
- The marker stones were not caught in a screenshot: a hand-made deep save puts the Foreman back at 1,200 ft on load, so the camera never reached 2,024 ft. The marker toast and reward did show.
- The balance bot stops at the ending, so nothing after it is in the sims; Acts I–IV are unchanged by this milestone.
Next: M12.
Questions for Tom: none.

## 2026-10-07 · M10-01 to M10-04 (Finds)
Done:
- Tom said a fast game is fine ("dopamine is the name of the game"). ADR-035 makes every time target a ceiling, `--strict` now fails only when a milestone is more than 15% late, and M9-07 (slowing Act III) is dropped.
- The tinker's cart parks by the shaft 6 min into a run, then 6–10 min after each pick, with three offers: a crate of bars, a miner's tonic, a grindstone, lamps, an old map or an Echo. It waits while you are away.
- The curio shelf: about 1 tile in 350 gives up one of 24 curios (four per biome, common, fine or singing, each with its own sound). Each speeds miners or hands; a full set adds +10% to both. They stay through every Cave-in. The shelf is a page in the Survey Book.
- Pell's dog, Biscuit: a helper who fetches chests near the Foreman.
- An eight-minute day: dusk, night with lit windows, fireflies and stars. Showers every 5–9 min make crops grow ×3 for a minute, and never start while you are away.
- Save v9 with migration and fixture. Canon §17.7, §21, the dog in §14. ADR-036.
State:
- `npm run check` is green (129 tests).
- Act I sim: first miner 6.0 min against 8 and first Cave-in 24.9 against 30, both early, which ADR-035 allows. The 15-minute wait median is 56 s.
- The dog walks a straight line to a chest, through rock if need be. That is a render shortcut.
Next: M11.
Questions for Tom: none.

## 2026-10-07 · M9-01 to M9-06 (The deep game)
Done:
- The sim reports the longest wait with nothing to buy in each act; Act II runs fail above 10 minutes.
- Metalwork: a cheap repeatable buy for silver, crystal, ember ore and gold (canon §20).
- Bunkhouse Roll (Memory, 12 Echoes): after a Cave-in, miners rehire themselves up to last run's count.
- The Cave-in ceremony: the shaft folds, Echoes count up over this run's verse notes, a stone drops on the cairn, "Last cycle you reached N ft". Tap skips; reduced motion shows a still card.
- A ghost mark on the depth ruler for last run at this minute, and an "ahead of last cycle" toast.
- Miners near the Foreman dig ×1.25 with a gold halo. Save v8 with migration and test. ADR-034.
- UI fix: ligatures are off, so "fi" no longer renders as a stray glyph.
State:
- `npm run check` is green.
- 8 ending seeds: median about 620 against 690 (−10%). Per-act median waits are under 10 minutes; single seeds still hit 10.8 (Act II) and 17.3 (Act III).
- Act III median is about 300 against 390 (−23%). It was already 240 before M9 (M8 runs), so this is old and needs its own tune.
- Seed 32676 reaches 1000 ft but never learns verses IX–XII in 1000 minutes; that is a bot problem, not a game one.
- Both Act III issues are split into a new ticket, M9-07, which comes next.
Next: M9-07, then M10.
Questions for Tom: none.

## 2026-10-07 · M8-01 to M8-06 (Payoffs)
Done:
- The first 15 minutes are busier. The first miner costs 12, the whetstone costs 1 × 1.4^n, a torch craft makes 5, and the copper pick costs 22.
- The sim's median longest wait with nothing to buy is 60 s, and `--strict` now fails above 90 s.
- Vein Break: at Rush ×5, the vein shatters, up to 12 tiles.
- Buy ×1, ×10 or Max, with a "ready in" estimate.
- An ore heap by the headframe and a bar stack by the forge.
- The Village sorts what you can afford first. Prices sit in the buttons, and the resource you're short of shows in red. Descriptions fold to one line. On a phone the sheet is half height.
- Rates now read in ore a minute.
- Chips use their ore's colour and show a name and rate when tapped. The phone header is one line. Alerts open their fix. ADR-033, canon §4.7.1 and §19.
State:
- `npm run check` is green.
- Act I: all targets ✓ over 9 seeds.
- Act III: median 332 against 390 ✓ over 6 seeds.
- Ending: one seed came in at 776 against 690 (+12%). The full ending run is still to come, so it may need a small retune in M9.
- M8-01's "3 miners at the first Cave-in" target was rewritten to a median of 2 (ADR-033).
- The haulage alert now compares like with like.
Next: M9.
Questions for Tom: none.


---

## 2026-10-07 · M7 Touch and aim (M7-01 to M7-06)

Done (PR #19): a ×2 loupe above the finger while it is on rock, with Crosshair and Off in Settings; smart dig (a finger's tap beside ore digs the ore, a 600 ms hold on ore queues the vein); a hover outline and label on the mouse; tips moved to a slim strip under the header, held until their system is in play and dropped once their act is behind; pinch, Ctrl + wheel and +/− zoom in whole steps; the Mountain view (a flat whole-pixel map with biome names, tap to go there); Esc closes the open sheet first; pixel icons with labels on phones for Foreman, Fields, Mountain and Menu; vibration on breaks and ore. canon §18, ADR-031, ADR-032. No save change.
State: `npm run check` green. Checked at 1280×800 and 390×844 with Playwright: phone nav fits, Esc closes the Village sheet, the hover label reads right. Draw time with 40 miners in headless Chromium: p95 1.0 ms default zoom, 2.5 ms farthest, 0.7 ms Mountain view; that machine is not a mid-range phone. Haptics and real pinch were driven by synthetic touches only, not a device.
Next: M8-01 a busier first five minutes.
Questions for Tom: none.

---

## 2026-10-06 · M6-07 Act crops

Done: the root cellar under the cookhouse (dig with iron and bricks, seed with spores, then a spore every 5 s), cress paddies (a barley plot flooded, 2 watered per pump, cress soup gives haul +20% a level), firepepper hot-beds (from the Ember Deep, each harvest burns an ember ore, pepper broth takes 0.1 off a face's heat for miners a level). Save v7 with a migration and fixture. canon §17.6, ADR-030. Five new sprites. The sim bot uses all three.
State: `npm run check` green (95 tests). Checked at 1280×800 and 390×844, no overflow.
Pacing with act crops (9 seeds, `--minutes=1000`): Act III median 364 min against 390 (−7%); ending median 709 against 690 (+3%; 531 to 887, one seed past 1000). Both inside ±15%, so no retune. The bot never places pumps, so paddies are untested by the sim.
Next: the Parking lot's M7 ideas.
Questions for Tom: none.

---

## 2026-10-06 · M6-06 The cairn and the tally board

Done: a tally board card at the foot of the Village Build tab: goods per second from your pick, the miners (as ore comes up the shaft), chests, the fields and the woodlot, over the last one to two minutes. Under it, the cairn's stones: each recent Cave-in's depth and the change from the run before, read from the Survey Book. No save change: the tally lives on the running game and refills within a minute. canon §17.5.
State: `npm run check` green (89 tests). Checked at 1280×800 and 390×844, no overflow.
Next: M6-07 act crops.
Questions for Tom: none.

---

## 2026-10-06 · M6 Holloway Above

Done: Tansy's fields, the cookhouse and feast bell, Rook's woodlot, trees that stand through the Cave-in, elders and their roots, the cairn, the Look up button, ripe and feast chips, Fields and Woodlot tabs, save v6 with a migration and fixture, canon §17, ADR-029. The sim bot now tends the surface.
State: `npm run check` green (88 tests). Act I strict sim green (First Cave-in 31.6 min). Checked at 1280×800 and 390×844.
Pacing (9 seeds each, live numbers): Act III median 359 min against 390 (−8%); ending median about 689 against 690 (8 of 9 seeds in, 443 to 948). Main before M6 for the same seeds: Act III 341, ending 659.
Not done: M6-06 tally board and M6-07 act crops.
Next: M6-06 and M6-07.
Questions for Tom: none.

## 2026-10-06 · M5-05 Balance pass

Done: re-ran every act on main after the offline fixes. Act I (all five targets) and Act II (Glowroot 158 min, target 170) were on target as they stood. Act III looked like a miss (2 of 9 villages never finished), but both causes were in the sim bot, not the game: it only counted Act III as done if 1000 ft and Verses VI to X fell in the same run, and it stopped mining for the aquamarine pick once it held 20 aquamarine, though the pick costs 30 plus 20 silver. With both fixed (ADR-028): Act III median 341 min against 390, all 9 villages finish. Ending: 7 of 9 seeds run before Tom asked to stop, median 659 min against 690 (532 to 867). No game numbers changed.
State: `npm run check` green (71 tests).
Not done: the last 2 ending seeds were cut short at Tom's request.
Next: M5 is complete. M6 (Tansy's fields and Rook's woodlot) goes to the Overworld features thread.
Questions for Tom: none.

## 2026-10-06 · R-01 to R-05 Review fixes and sound

Done: from the code review Tom approved. Offline catch-up now pays in full (8 h away: 942 tiles against 927 in real time, was 626), and coming back no longer freezes the page (8 h with 40 miners: about 1 s, was 9.1 s). Absences under a minute play on instead of being lost. The balance sim has `--strict`; CI runs Act I strictly on every PR, and a nightly workflow runs the longer acts. Sound: synthesised effects for digging, ore, the forge, purchases, pests, chests, records, biomes, collapses and the Cave-in; each verse plays the Undersong so far; a drone that deepens with depth; Sound and The hum in Settings; M mutes (ADR-026, ADR-027).
State: `npm run check` green (71 tests). Both Act I and Act II sims give exactly the same output as main, so live pacing is unchanged. Checked in headless Chromium at 1280×800 and 390×844: no errors, sound reaches the output while digging, and the new Settings rows save. Nobody has listened to it yet.
Next: M5-05 balance pass (offline returns now pay more).
Questions for Tom: does the sound feel right? Every number is in `src/data/sounds.ts`.

## 2026-10-06 · M5-04 Launch build

Done: `npm run build:itch` builds and zips the game for itch.io (`tools/pack-itch.ts`, no new dependency). The zip was tested served from a subfolder at itch's embed size. Page text, upload settings and tags are in `docs/itch-page.md`. Added a favicon and a page description.
State: `npm run check` green.
Not done: the itch.io page itself, which needs Tom's account.
Next: M5-05 balance pass, once the offline catch-up fixes from the code review thread are in.
Questions for Tom: do you want the itch.io page made? I can't create it from here; upload the zip from the latest build, or ask for the zip and I'll attach it.

## 2026-10-06 · M5-03 Achievements

Done: 18 achievements (ADR-025): verses known, biomes reached, Cave-ins, a full bunkhouse, chests, every helper, charms, Echoes, both endings and Endless Depth. Earned ones are kept in `story.ever` as `ach:<id>`, which already survives a Cave-in and is already saved, so there is no save change. The Survey Book lists them all, locked ones with what earns them. A toast announces each; several at once share one toast, which is what an older save sees the first time it loads.
State: `npm run check` green. Checked at 1280×800 and 390×844.
Next: M5-04 itch.io build. M5-05 balance pass waits for the offline fixes.
Questions for Tom: the achievement names are mine; edit freely in `src/story/achievements.ts`.

## 2026-10-06 · M5-01 Settings, M5-02 Accessibility

Done: a Settings panel in the menu, saved apart from the game (ADR-024). Motion (Auto, Full or Reduced) now governs screen shake and every animation, where before shake ignored the device setting. Text size goes to 1.3×. Dark faces get a moon and rock too hot to work gets a heat badge, so neither is shown by colour alone. Numbers can be scientific.
State: `npm run check` green. Checked at 1280×800 and 390×844. No save change.
Next: M5-03 achievements, M5-04 itch.io build. Sound is being built in the code review thread; M5-05 balance pass waits for its offline fixes.
Questions for Tom: none.

## 2026-10-06 · M4 The Heart

Done: Act IV and the ending. Heat below 250 ft slows miners and then stops them at faces too hot to work; vents (tool, craft, and Wren's cold lamps helper) and standing water cool. Cinder wisps gather at hot faces and Pell's rounds handle them. Verse XI sits in a ring of ember ore and Verse XII in the Heartstone, which only the Heart pick breaks. Singing all twelve verses offers the choice: seal the shaft (Endless Depth, 64 more rows whenever the village nears the floor) or sing the last verse (New Song+, more Echoes, verses sung back). Hot faces glow on screen; "Held back by: Heat". ADR-023, PR #8.
State: `npm run check` green. Ending sim, 8 seeds continued from their Act III saves: 507, 530, 655, 691, 729, 739, 829, 838 min, median 710 against 690 (inside ±15%). The spread mostly comes from Act III (199 to 762 min). Tests for hot faces and the vent crew found a real bug (the crew and Endless Depth read the reach depth before it was worked out); fixed.
Not done: none. (An earlier version of this entry said the "old shafts from earlier cycles" epic was not built. It is: the Old Shafts Echo upgrade leaves earlier cycles' shafts in the mountain.)
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
