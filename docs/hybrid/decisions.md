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
