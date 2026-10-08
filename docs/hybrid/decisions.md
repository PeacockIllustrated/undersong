# Holloway & Co.: decisions (hybrid branch)

Holloway & Co. is a branch of Undersong that melds it with Coal LLC: you play the Foreman directly as a platformer, and you fill a daily coal quota against the clock. These ADRs bind only the hybrid. Undersong's own `docs/decisions.md` still governs everything under `src/` outside `src/co/`.

Plan: https://claude.ai/artifact/H2XC8ouLV9tq11cWH5snja · Sprites: https://claude.ai/artifact/2PxMnUUX1QaP4eCB3vAB88

## ADR-H001 · The hybrid lives beside Undersong, not instead of it
2026-10-07. The hybrid's code is all in `src/co/`, and it reuses Undersong's world generator, tiles, sprites, sound, pick table and verses without changing them. The one shared change is the new `COAL` material (id 22) with its `ore-coal` overlay. Holloway & Co. is served at `/` and Undersong at `/undersong.html`. The hybrid has its own save key (`hollowayco.save`), so neither game can touch the other's progress. The branch merges into `hybrid/main`, never `main`, because `main` deploys production.

## ADR-H002 · The mine forgets every night
2026-10-07. Each day is a fresh mine from `daySeed(contractSeed, day)`, with the shaft sunk to the bought depth and laddered. The world is not saved. A reload mid-day restarts that day, which keeps the save tiny and makes the day the unit of play, like a Coal LLC shift.

## ADR-H003 · Coal is the quota, and scrip is the money
2026-10-07. Coal tipped into the kibble fills the day's quota. Coal over quota sells for scrip at dusk. Ore sells for scrip straight away. Bars, the forge and smelting from the plan are deferred to a later milestone.

## ADR-H004 · Missing a quota is the Cave-in
2026-10-07. A short day ends the contract unless a Union card pardon covers it. The contract pays Echoes, which are spent in the Survey Book and kept forever. The Echo formula has a floor of 1 once any coal went up, so no Cave-in is wasted (Tom: dopamine first).

## ADR-H005 · Crews are idle income, kept simple
2026-10-07. Hands add coal every step at a rate from the pick, deputies, whetstone and Echoes. Gangs dig drifts off the shaft only as a visual; they do not haul through the world. Night-shift pay while away is 25% of the crew rate, capped at 8 hours.

## ADR-H006 · Direct control at a fixed 60 Hz
2026-10-07. WASD and the mouse drive the Foreman: run, jump with coyote time and a jump buffer, climb ladders (W climbs whenever you are on one), aim and hold to dig. The sim steps at 60 Hz, at most 8 steps a frame. On a phone, the left thumb moves, the right thumb aims and digs, and there are Jump, Charge and Ladder buttons.

## ADR-H007 · New text for the Company, canon verses unchanged
2026-10-07. The Company, the Tallyman and the contract lines are new and live in `src/co/story/company.ts`. Verse carvings show Undersong's canon verses word for word.

## ADR-H008 · Every shift is graded, and streaks pay
2026-10-07. A met quota is graded Good (×1.25), Bumper (×2) or Record (×3) on the deposit, with a scrip bonus stamped on the tally. Met quotas in a row build a streak that multiplies surplus pay. A tinker's cart sells three relics each night and can be turned out for scrip. All of this is to make every night pay out something (Tom: dopamine first).

## ADR-H009 · Each ore has a job, and crews follow veins
2026-10-07 (Tom: "the miners just strip mine", "each ore responsible for something instead of just money"). Gangs now tunnel towards the nearest coal or ore vein instead of clearing rows. Ore banks at the kibble into the store room and is spent at the Company Store next to scrip: copper and tin for picks and kit, iron for the deeper tools, glowcap for lamps, silver for promotions, aquamarine for pumps, crystal for the scatter pick, ember for the lance, gold sells for scrip, and heartstone adds Echoes at the Cave-in. The 16 picks each have their own sprite (`copick-*`).

## ADR-H010 · Crews have a promotion ladder
2026-10-07. A hand can be promoted to putter (hauls spill up), shotfirer (gangs break harder rock, faster), lampman (+crew rate) or pumpman (drains water at dawn). Promotions cost a hand and silver. Up to 40 gangs are drawn; the rest is the sprite cap.

## ADR-H011 · A tool belt, not a pick upgrade
2026-10-07. The scatter pick, mortar, drill rig and cold lance are bought per contract and swapped with 1 to 5 or the wheel. One-way platforms (G) join ladders. A Vein Rush of 6 shatters the rest of the vein into the pack.

## ADR-H012 · Foremen and Seams are the run modifiers
2026-10-07. Eight Foremen (one rule each) and six Seams (one map rule each) are chosen at the signing table. Foremen unlock from the village record; each Seam opens by surviving day 10 on the one before. Day 15 earns a Foreman badge; day 10 a Seam badge. Heat in the Ember Chimney and below 250 m hauls the Foreman up unless the cold lance is in hand.

## ADR-H013 · Idle is night-shift pay and the Overman
2026-10-07. Time away at night pays 25% of the crew's rate as scrip plus a little copper, tin and iron, capped at 8 hours, and never ends a contract. The Overman (Survey Book) plays tomorrow without the Foreman at 60% crew and settles it, so a night can be skipped.

## ADR-H014 · Two endings at Verse XII
2026-10-08. Breaking Verse XII (in the Hollow Heart) brings a choice that night. Fill the Last Quota signs the Endless Contract: the contract continues and the quota grows ×1.8 more a day. Sing the Last Verse ends the contract for three times its Echoes and starts New Song+, which adds +50% to every Echo earned after it, stacking. The cave-in screen and title show which ending was reached. Save v5.

## ADR-H015 · Company Rules and feats
2026-10-08. After three contracts, four Company Rules can be signed into a contract: Tight Ledger (quota ×1.5, +50% Echoes), Short Shifts (days ×0.6, +50%), No Mercy (no pardons or easy days, +30%) and Dead Lamps (crew ×0.5, +50%). Surviving day 15 under a Rule earns its badge. 65 feats count from the day's events and the nightly tally into `meta.stats`, and toast when earned. Save v6.

## ADR-H016 · The balance bot is a fair player, not a perfect one
2026-10-08. `npm run sim:co` plays contracts headless. Its Foreman walks to the nearest diggable vein, tunnels at the pick's real speed, pays a walking toll of ×1.8 the run speed per tile, and climbs to the kibble when full or near the bell. It buys the store greedily and the Survey Book cheapest-first. It reports days per contract, minutes, Echoes, and who sent the coal up. It does not use the tool belt, so tool shares only show pick, crew and blasts.
