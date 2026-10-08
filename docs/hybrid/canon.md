# Holloway & Co.: canon (hybrid branch)

Every number lives in `src/co/data/co.ts`, under the section numbers below. Change it there and update this page.

- §2 **Day:** 180 s base, +20 s per Lantern hours level (up to 6), last bell at 20 s. At dusk, a full pack is banked at 50%.
- §3 **Quota:** Q(d) = 45 × 1.45^(d−1), rounded up. Days 1–3 × 0.75 (day 1 = 34). Every 7th day is an audit, × 1.6.
- §4 **Body:** 0.7 × 1.45 tiles, run 6 tiles/s, gravity 52, jump 18.2 (about 3 tiles), coyote time, a jump buffer, ladders, platforms, swimming, double jump, wings (glide at 3.2, two flaps) and a jetpack.
- §5 **Digging:** seconds per tile = H(depth) / (pick power × 4 × hand mult), reach 2.6 tiles. A Vein Rush builds +25% drops per adjacent break, up to ×3; at a chain of 6 the rest of the vein (up to 24 tiles) shatters into the pack.
- §6 **Drops:** a coal tile gives 2 coal; an ore tile gives 1 of its ore (`DROPS`). Gold sells for 60 scrip; heartstone adds 1 Echo at the Cave-in.
- §7 **Shaft:** 8 tiles deep, +8 per level, laddered, with the kibble at the headframe (or the shaft foot once bought).
- §8 **Crew:** a hand digs 0.2 × √pick power coal/s; a deputy leads 10 hands for +50%. Gangs (one per 5 hands, up to 40 drawn) tunnel to the nearest vein. Promotions: putter (hauls 0.6 spill/s), shotfirer, lampman, pumpman (`ROLE_FX`).
- §9 **Company Store:** cost(n) = base × growth^n scrip, plus ore for most items (`SHOP`). 16 picks (`CO_PICKS`), each gated by an ore.
- §10 **Kit at dawn:** pack 24, ladders 8, platforms 6, charges 0, blast radius 1, plus upgrades (`UPGRADE`).
- §11 **Chests:** 15 × (1 + depth/12) scrip, 30% relic, one guaranteed per biome band each day.
- §12 **Echoes:** max(1, ⌊√(coal / 20) × (1 + 0.15·days) × (1 + 0.25·verses)⌋) + heartstone + Picket Line, then × (1 + 0.5·New Song+) × (1 + Rules), or 0 if no coal went up. Each Echo ever earned gives +3% to digging and crews (`ECHO_POWER`).
- §13 **Survey Book:** 12 rows including the Union branch (Closed Shop, Picket Line, Seniority, the Overman), cost(l) = base × growth^l Echoes.
- §14 **Grades:** quota ×1.5 Good (+40% of quota as scrip), ×2 Bumper (+100%), ×3 Record (+200%). Streak +15% a met quota, up to ×3.
- §15 **Gems** in deep chests: six kinds, value × (1 + depth/12) scrip.
- §16 **Ores** (ADR-H009): copper, tin, iron, glowcap, silver, aquamarine, crystal, ember, gold, heartstone, each with a job in the store.
- §17 **Tinker's cart:** three relics a night; relic and reroll costs climb with the day.
- §18 **Tools:** scatter pick (7 rays, 0.42 s), mortar (radius 2, bursts water), drill rig (pick seconds × 1.6, 60 tiles), cold lance (×3 on hot rock, heat-proof).
- §19 **Foremen:** eight, one rule each (`FOREMEN`, `FOREMAN_FX`); day-15 badge.
- §20 **Seams:** six maps (`SEAM_DEFS`, `SEAM_FX`); each opens by surviving day 10 on the one before; day-10 badge.
- §21 **Heat and idle:** heat below 250 m rises 0.08/s, falls 0.25/s. Away pay is 25% of the crew rate as scrip plus 2% as ore, capped at 8 h. The Overman runs a day at 60% crew.
- §22 **Endings:** Verse XII brings the choice. Endless Contract: quota × 1.8 more a day. Last Verse: Echoes × 3, then New Song+ +50% Echoes each.
- §23 **Company Rules:** after 3 contracts. Tight Ledger quota ×1.5 (+20% Echoes), Short Shifts days ×0.6 (+10%), No Mercy no pardons or easy days (+10%), Dead Lamps crew ×0.5 (+20%). Day-15 badge.
- §24 **Feats:** 65 (`FEATS`), each a counter in `meta.stats` or a record reaching n.
- **Save:** `hollowayco.save`, version 6, lz-string. Every bump has a migration in `fromSave` and a test.

## Balance (2026-10-08, `npm run sim:co -- --seeds=5 --contracts=10`)
First Cave-in at a median 37 min, on day 11. Contracts fall on days 11, 11, 12, 13, 15, 16, 19, 21, 26, 30, taking 37 to 107 min each as the village grows. Under all four Rules, contract 8 falls on day 20 in 43 min for about the same Echoes as a plain contract.
