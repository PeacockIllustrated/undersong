# Holloway & Co.: roadmap (hybrid branch)

The milestones from the dev plan (https://claude.ai/artifact/… "Holloway & Co. Dev Plan", v2). H0 and H1 shipped in
PR #30. Tom asked on 7 Oct 2026 for the whole scope to be built, with balance testing last.

## H2 · Crews
- [x] Gangs tunnel after the nearest coal or ore vein instead of strip-mining (ADR-H009)
- [x] Promotion ladder: putter, shotfirer, lampman, pumpman (deputy already), each doing a visible job
- [x] Putters carry spill: what does not fit in a full pack waits at the face and putters haul it up
- [x] Crowd renderer: gang count scales with the payroll up to a sprite cap (50 to 400, default 200), banners
- [x] Dusk tally sheet shows who did the work as shares that add to 100%

## H3 · Tools and finds
- [x] Tool belt: 1 to 5 and the scroll wheel swap tools; a tool ring on phones
- [x] Scatter pick: hits a cone; aimed down in the air it rocket-jumps
- [x] Mortar: lobs a shell far, bursts through water
- [x] Drill rig: placed, digs straight down on its own
- [x] Cold lamp lance: digs ember and basalt fast, and keeps the heat off
- [x] One guaranteed chest per biome band per day
- [x] Vein Break: a long Vein Rush shatters the rest of the vein into the pack
- [x] Platforms (G): one-way, drop through with S

## H4 · The Contract
- [x] Foremen 1 to 4 chosen at signing: Apprentice, Smith's Hand, Lamplighter, Fieldhand
- [x] Union branch: Seniority, Closed Shop, Picket Line (Echoes per day past your best)
- [x] Verses I to V found by depth; the tally board of verses

## H5 · Seams
- [ ] Six Seams with one rule each: Open Cut, Drowned Street, Hanging Geode, Old Workings, Ember Chimney, Hollow Heart
- [ ] Heat in the Ember Chimney and the deep; the lance and the Stoker answer it
- [x] Foremen 5 to 8: Woodcutter, Dog-handler, Lone Foreman, Stoker
- [ ] Badges: day 15 survived per Foreman and per Seam

## H6 · Overman and the movement ladder
- [ ] Wings between spring boots and the jetpack: glide and flap
- [ ] The Overman (Survey Book): "Let the Overman run it" plays a day at 60% of the crew
- [ ] Night-shift pay pays ore as well as scrip, never ends a contract

## H7 · The Company and the Song
- [ ] The Tallyman's nightly lines, audit notices and Foreman intros
- [ ] Verses VI to XII by depth; the Hollow Heart holds Verse XII and the choice
- [ ] Ending A, Fill the Last Quota: the Endless Contract. Ending B, Sing the Last Verse: New Song+

## H8 · Company Rules and launch
- [ ] Four hard modes (Company Rules) with badges
- [ ] About 60 achievements with a panel
- [ ] Balance pass with a headless bot (`npm run sim:co`)
- [ ] Both layouts, the smoke test, a static build for itch, and the holloway-co repo updated

## Parking lot
- Settings panel for the sprite cap beyond the default
