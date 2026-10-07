# Undersong canon

This file lists every name, number, colour and line of verse the game uses. **If a value isn't in this file, it doesn't exist yet.** Add it here (and to `src/data`) in the same commit you first use it. Values marked _v0_ are first-pass and are expected to be tuned with `npm run sim`.

---

## §1 Names

| Thing              | Canon name                                    | Never call it                        |
| ------------------ | --------------------------------------------- | ------------------------------------ |
| The game           | Undersong (working title)                     | —                                    |
| Village            | Holloway                                      | the town, the base                   |
| Player             | the Foreman                                   | the player character, hero           |
| Lamplighter        | Old Wren                                      | Wren the lamplighter (fine in prose) |
| Child              | Pell                                          | —                                    |
| Smith              | Bram                                          | —                                    |
| Farmer             | Tansy                                         | —                                    |
| Woodcutter         | Rook                                          | —                                    |
| Prestige           | the Cave-in                                   | reset, rebirth, ascension            |
| Prestige currency  | Echoes                                        | points, souls                        |
| Prestige screen    | the Survey Book                               | prestige menu                        |
| Light resource     | Lumen                                         | mana, energy                         |
| Story collectibles | Verses (I–XII, Roman numerals)                | lore, notes                          |
| Buildings          | Bunkhouse, Forge, Lamp-works, Kiln, Song-loom | —                                    |

## §2 Biomes

One tile is **4 ft** deep. Depths are measured from the grass line.

| #   | Biome             | Depth (ft) | Act | Main ore             | New system                       | Threat         | Verses  |
| --- | ----------------- | ---------- | --- | -------------------- | -------------------------------- | -------------- | ------- |
| 0   | Holloway          | 0          | I   | —                    | Buildings                        | —              | —       |
| 1   | Topsoil & Stone   | 0–150      | I   | Copper, Tin          | Miners, Forge, rope              | Burrow beetles | I–II    |
| 2   | Glowroot Caverns  | 150–400    | II  | Iron, Glowcap spores | Lumen, lanterns, rails, supports | Lantern moths  | III–V   |
| 3   | The Flooded Halls | 400–700    | III | Silver, Aquamarine   | Water, pumps                     | Cave eels      | VI–VIII |
| 4   | Singing Geodes    | 700–1000   | III | Resonant crystal     | Song-loom, charms                | Shard golems   | IX–X    |
| 5   | Ember Deep        | 1000–1400  | IV  | Ember ore, Gold      | Heat, cooling                    | Cinder wisps   | XI      |
| 6   | The Hollow Heart  | 1400+      | IV  | Heartstone           | Ending, Endless Depth            | —              | XII     |

## §3 Verses

These are the final text. Each verse is two lines in folk metre. Don't paraphrase them.

| #    | Biome           | Text                                                                                               |
| ---- | --------------- | -------------------------------------------------------------------------------------------------- |
| I    | Topsoil & Stone | Hush now, the hollow is calling you home, / down past the roots where the copper veins roam.       |
| II   | Topsoil & Stone | Dig with your hands and dig with your name; / the stone will forget, but the song stays the same.  |
| III  | Glowroot        | Down where the lanterns forget their light, / the stone remembers, the stone holds tight.          |
| IV   | Glowroot        | Glowcaps are candles that nobody set; / someone was here, and they’re here with you yet.           |
| V    | Glowroot        | Old picks are waiting with marks like your own; / you held them before, in the dark, all alone.    |
| VI   | Flooded Halls   | Under the water a village lies sleeping; / every lit window is one we’re still keeping.            |
| VII  | Flooded Halls   | Hush, little foreman, the river runs slow; / it carried us here a long time ago.                   |
| VIII | Flooded Halls   | Every street drowned is a street that we knew; / every lost house had a lamp burning through.      |
| IX   | Singing Geodes  | Crystal will carry what voices let fall; / sing to the stone and the stone sings it all.           |
| X    | Singing Geodes  | We sealed it and slept, and we woke, and we came; / the mountain was hollow, and we were the same. |
| XI   | Ember Deep      | Heat in the deep where the old fires keep; / some things are buried that never would sleep.        |
| XII  | Hollow Heart    | Here is the heart, and the heart is a song; / sing it, remember, you’ve known it all along.        |

**Endings.** _Seal the shaft_ leads to Endless Depth. _Sing the last verse_ leads to New Song+.

## §4 Formulas (v0)

| §     | Name                      | Formula                                                                                                                                                                                                                         |
| ----- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1   | Building cost             | `cost(n) = base × 1.15^n` (n = number already owned)                                                                                                                                                                            |
| 4.2   | Rock hardness at depth    | `H(d) = H_material × (1 + d_ft / 60)^1.3`                                                                                                                                                                                       |
| 4.3   | Echo gain on Cave-in      | `floor( sqrt(maxDepth_ft / 10) × (1 + 0.25 × versesFoundThisRun) )`                                                                                                                                                             |
| 4.4   | Miner output              | `ore_per_s = pickPower × lightFactor / H(d)`                                                                                                                                                                                    |
| 4.5   | Light factor              | `L ≥ 0.6 → 1.0`, `0.3 ≤ L < 0.6 → 0.7`, `L < 0.3 → 0.4`                                                                                                                                                                         |
| 4.6   | Hand-mining time per tile | `seconds = H(d) / (pickPower × 1.15 × veinRushMult × lightFactor)` (was 2.5; tuned by the balance sim, ADR-015). `lightFactor` (§4.5) applies only from 150 ft down (ADR-017); above that it is 1                               |
| 4.7   | Vein Rush                 | `mult = min(5, 1 + 0.25 × chain)`; the chain grows with each ore tile mined next to (8-way) the last one, and resets on non-ore or after the Foreman stands idle 1.2 s                                                          |
| 4.7.1 | Vein Break                | an ore tile broken by hand with the Rush at its ×5 cap breaks every connected (8-way) tile of the same ore the pick can break, nearest first, up to 12, one every 90 ms, each paying as hand-mined at ×5. Not offline (ADR-033) |
| 4.8   | Offline gain              | `rate × min(t, cap) × eff`; base cap 8 h, eff 0.5; Long Shift 16 h, eff 0.75; max cap 24 h, eff 1.0. Absences under 60 s play on at full speed, with no summary (ADR-026). Pests and collapses wait while you are away          |
| 4.9   | Haul throughput           | `ore_per_s_max = carrierSpeed_tiles_per_s × capacity / shaftDepth_tiles`                                                                                                                                                        |
| 4.10  | Cave-in unlock            | `maxDepth_ft ≥ 300` **and** Verse II found                                                                                                                                                                                      |
| 4.11  | Echo power                | every worker's rate × `(1 + 0.03 × echoesEverEarned)` (ADR-017)                                                                                                                                                                 |
| 4.12  | Homecoming                | after a Cave-in, every worker, the forge and the haul run ×3 until this run is 60% as deep as your best (ADR-020)                                                                                                               |
| 4.13  | Verse power and cache     | every verse ever known speeds every worker by 5%. Each verse found in a run pays its cache: I 10 and II 15 copper bars; III 8, IV 10, V 12 iron bars; VI–X 8, 10, 12, 15, 20 silver bars; XI 15 and XII 25 gold bars (ADR-020)  |
| 4.14  | Whetstone                 | `cost(n) = 1 × 1.4^n` copper bars (ADR-033); each level +12% hand-mining. Resets on a Cave-in (ADR-020)                                                                                                                         |
| 4.15  | Village power             | `echo power × verse power × homecoming` multiplies every worker                                                                                                                                                                 |

## §5 Pacing targets

These are for an engaged player mixing active and idle play. The balance sim must land within ±15% of each target.

| Milestone                                                            | Target                              |
| -------------------------------------------------------------------- | ----------------------------------- |
| First bar smelted                                                    | 1 min (was 5; see ADR-015)          |
| First miner hired                                                    | 8 min (was 2; see ADR-015)          |
| Verse I found                                                        | 10 min                              |
| 150 ft (Glowroot entrance visible)                                   | 17 min (was 20; see ADR-020)        |
| First Cave-in available                                              | 30 min (was 45; see ADR-020)        |
| Echoes from a typical first Cave-in                                  | 6–10                                |
| Glowroot cleared (Act II end): 400 ft reached and Verses III–V known | 2 h 50 min (was 4 h; see ADR-020)   |
| Act III end: 1000 ft reached and Verses VI–X known                   | 6 h 30 min (was 9 h; see ADR-021)   |
| Ending reached: Verse XII found and the choice made                  | 11 h 30 min (was 14 h; see ADR-023) |

## §6 Art

### 6.1 Master palette (32)

These are the only colours allowed in sprites.

| Ramp    | Colours                                 |
| ------- | --------------------------------------- |
| Earth   | `#3A2A20` `#6B4329` `#8A5A3B` `#A46D48` |
| Grass   | `#3A7A2C` `#4F9A3A` `#6CC04A`           |
| Stone   | `#3F444E` `#555B66` `#6D7480` `#878E9A` |
| Slate   | `#262940` `#373A52` `#4B4F6B` `#5F6487` |
| Copper  | `#9C5420` `#D9823B` `#F2A35E`           |
| Gold    | `#B8902A` `#FFD65A` `#FFF2A8`           |
| Glowcap | `#1E6B66` `#5FF0D8` `#B9FFF3`           |
| Crystal | `#2A5E86` `#7FD6FF` `#C4F0FF`           |
| Ember   | `#7A2A1E` `#E0532F` `#FF9A3C`           |
| Night   | `#141A33` `#E8F4F0`                     |

Sky colours and UI panel colours (`#5AA8DA` to `#BFE6F5`, and the slot navy `rgba(40,56,120,.72)` with border `#8DA2E8`) belong to the renderer and the UI. They are not sprite colours.

### 6.2 Biome palettes

| Biome           | Colours (6)                                                            |
| --------------- | ---------------------------------------------------------------------- |
| Holloway        | sky `#3B6E9C` `#A6D9F2`, `#6CC04A` `#4F9A3A` `#8A5A3B`, roof `#7A3B2E` |
| Topsoil & Stone | `#8A5A3B` `#6B4329` `#6D7480` `#555B66` `#D9823B` `#F2A35E`            |
| Glowroot        | `#4B4F6B` `#373A52` `#1E6B66` `#5FF0D8` `#B9FFF3` `#878E9A`            |
| Flooded Halls   | `#262940` `#373A52` `#5F6487` `#7FD6FF` `#878E9A` `#E8F4F0`            |
| Singing Geodes  | `#262940` `#2A5E86` `#7FD6FF` `#C4F0FF` `#4B4F6B` `#FFF2A8`            |
| Ember Deep      | `#3A2A20` `#7A2A1E` `#E0532F` `#FF9A3C` `#FFD65A` `#373A52`            |
| Hollow Heart    | `#141A33` `#262940` `#4B4F6B` `#FFD65A` `#FFF2A8` `#B9FFF3`            |

(Holloway's sky and roof colours are renderer or prop colours, which §6.1 allows.)

### 6.3 Sizes and scale

The base tile is 16×16, characters are 16×24 and items are 16×16. HUD icons are 8×8 or 16×16. Props (village buildings, trees) are 16–64 wide and 8–48 tall, in steps of 16 and 8 (ADR-011). Render scale is ×2, ×3 or ×4 (integers only). Animation runs at 8–12 fps.

## §7 Lighting constants

| Constant            | Value                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Channels            | warm (sky, torch, lantern, ember), cool (glowcap, crystal)                                  |
| Decay through air   | 0.085 per tile                                                                              |
| Decay through solid | 0.26 per tile                                                                               |
| Sky light           | 1.0 at and above the grass line                                                             |
| Torch               | 1.0 warm to 150 ft, 0.6 below (ADR-013); flicker ±6% (cosmetic only, never affects the sim) |
| Lantern             | 1.5 warm while lit, costs Lumen upkeep (§9)                                                 |
| Water               | light decays 0.12 per tile through flooded tiles                                            |
| Foreman's lamp      | 0.9 warm glow around the Foreman, render only (ADR-010)                                     |
| Ember ore           | 0.6 warm                                                                                    |
| Heartstone          | 0.7 warm                                                                                    |
| Glowcap             | 0.85 cool                                                                                   |
| Crystal             | 0.9 cool                                                                                    |
| Darkness overlay    | `rgba(6,8,18, (1 − L) × 0.94)`                                                              |
| Cool tint           | `rgba(70,230,220, cool × 0.16)` underground only                                            |
| Warm tint           | `rgba(255,170,70, warm × 0.07)` underground only                                            |

The sim uses the light value **without flicker**. Flicker is applied in render only.

## §8 Materials (v0)

| Material         | H_material            | Drops                       | Biome                     |
| ---------------- | --------------------- | --------------------------- | ------------------------- |
| Dirt             | 1                     | —                           | 1                         |
| Stone            | 4                     | Rubble                      | 1–2                       |
| Copper ore       | 4                     | 2 Copper ore                | 1                         |
| Tin ore          | 4                     | 2 Tin ore                   | 1                         |
| Slate            | 7 (M6, ADR-029)       | Rubble                      | 2+                        |
| Iron ore         | 8                     | 2 Iron ore (was 1; ADR-017) | 2                         |
| Glowcap cluster  | 2                     | 2 Glowcap spores            | 2                         |
| Silver ore       | 14                    | 1 Silver ore                | 3                         |
| Aquamarine       | 18                    | 1 Aquamarine                | 3                         |
| Resonant crystal | 24                    | 1 Resonant crystal          | 4                         |
| Ember ore        | 96 (was 32; ADR-023)  | 1 Ember ore                 | 5                         |
| Gold ore         | 84 (was 28; ADR-023)  | 3 Gold ore                  | 5                         |
| Heartstone       | 180 (was 60; ADR-023) | 1 Heartstone                | 6                         |
| Basalt           | 60 (ADR-023)          | Rubble                      | 5                         |
| Heartrock        | 78 (ADR-023)          | Rubble                      | 6                         |
| Old brick        | 10                    | 1 Brick                     | shrines, drowned town     |
| Singing stone    | 17 (M6, ADR-029)      | —                           | the Geodes' own rock (M3) |

### 8.1 Pick gates (ADR-017)

The lowest pick that can break a material at all. Anything not listed breaks with the wooden pick. Miners use the village's best pick, so the same gate applies to them.

| Material                    | Needs                |
| --------------------------- | -------------------- |
| Slate                       | Copper pick          |
| Iron ore                    | Bronze pick          |
| Silver ore, old brick       | Iron pick            |
| Aquamarine, singing stone   | Silver pick          |
| Resonant crystal            | Aquamarine pick      |
| Basalt, ember ore, gold ore | Crystal pick         |
| Heartrock                   | Ember pick           |
| Heartstone                  | Heart pick (ADR-023) |

Verses III–V are carved inside old brick shrines (a 3×3 ring), so the Glowroot verses need an iron pick.

### 8.2 Ore veins (generator thresholds, ADR-017)

Topsoil: copper `n1 > 0.7`, tin `n2 > 0.76`. Glowroot: iron `n1 > 0.7`, copper `n2 > 0.72`, tin `n3 > 0.78`. Higher means rarer.

## §9 Buildings and items: Act I (v0)

| Thing             | Base cost                                      | Effect                                                                               |
| ----------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| Miner (Bunkhouse) | 12 Copper bars, ×1.15 per miner (ADR-033)      | Mines one assigned face                                                              |
| Forge             | free at start                                  | Turns 5 ore into 1 bar every 2 s. Copper, tin and bronze (2 copper bars + 1 tin bar) |
| Wooden pick       | start                                          | pickPower 1                                                                          |
| Copper pick       | 22 Copper bars (ADR-033)                       | pickPower 2                                                                          |
| Bronze pick       | 25 Bronze bars                                 | pickPower 3                                                                          |
| Rope haul         | start                                          | carrierSpeed 1 tile/s, capacity 5                                                    |
| Winch lift        | 40 Copper bars                                 | carrierSpeed 3 tiles/s, capacity 10                                                  |
| Rails (Act II)    | 8 Iron bars per 10 tiles, at most 80 (ADR-021) | carrierSpeed 8 tiles/s, capacity 25                                                  |
| Torch             | 1 Copper bar for 5 (ADR-033)                   | Light 1.0, no upkeep, radius limited by decay                                        |

### 9.1 Act I extras (v0)

| Thing          | Value                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| Burrow beetle  | Appears at a miner working a face with light below 0.3, chance 1/90 per second; stops that miner until tapped |
| Old chest      | One roll: 3–8 copper bars, 2–5 tin bars or 3–6 torches                                                        |
| Miner choice   | Exposed ore nearest the shaft first, then rock with ore within 2 tiles, then the shaft floor                  |
| Miners' rubble | Left in the mine, not hauled                                                                                  |

## §10 Echo upgrades (v1)

Three branches: six in Hands and Lamps, seven in Memory (Bunkhouse Roll, ADR-034). Each needs the one above it in its branch.

| Branch | Upgrade         | Cost | Effect                                                                                                            |
| ------ | --------------- | ---- | ----------------------------------------------------------------------------------------------------------------- |
| Hands  | Steady Hands    | 1    | Hand-mining +25%                                                                                                  |
| Hands  | Cheap Bunks     | 2    | Miner cost −10%                                                                                                   |
| Hands  | Strong Backs    | 6    | Miners dig 30% faster                                                                                             |
| Hands  | Old Calluses    | 12   | Vein Rush step 0.25 → 0.35                                                                                        |
| Hands  | Heirloom Pick   | 25   | Start each run with the pick one below your best                                                                  |
| Hands  | Deep Hands      | 60   | Everyone digs 50% faster below 1000 ft                                                                            |
| Lamps  | Lamplit         | 2    | Torchlight 15% stronger                                                                                           |
| Lamps  | Steady Flame    | 5    | Torches no longer gutter below 150 ft                                                                             |
| Lamps  | Wren’s Wicks    | 8    | Lanterns burn 40% less Lumen                                                                                      |
| Lamps  | Glowcap Gardens | 14   | Glowcaps give twice the spores                                                                                    |
| Lamps  | Moth Ward       | 22   | Beetles, moths and wisps come half as often                                                                       |
| Lamps  | Bright Pages    | 45   | The Lamp-works makes 50% more Lumen                                                                               |
| Memory | Pell’s Hum      | 2    | The nearest unfound verse glints within 20 tiles (first in the branch, ADR-020)                                   |
| Memory | Remembered Rope | 3    | Start each run with the Winch lift                                                                                |
| Memory | Bram’s Ledger   | 9    | Start each run with 30 copper bars and 10 tin bars                                                                |
| Memory | Bunkhouse Roll  | 12   | After a Cave-in, miners hire themselves as bars come in, up to last run’s count, one every 1.5 s (M9-03, ADR-034) |
| Memory | Old Shafts      | 16   | The shaft is already dug to half your best depth                                                                  |
| Memory | Long Shift      | 28   | Away time counts for 16 h at 75% (§4.8)                                                                           |
| Memory | Survey Instinct | 50   | Cave-ins give 25% more Echoes                                                                                     |

## §11 Buildings and items: Act II (v0)

| Thing               | Cost                                                                                               | Effect                                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Kiln                | 20 Copper bars × 1.15ⁿ; offered from 80 ft                                                         | Each level bakes 4 rubble into 1 brick every 3 s                                                                   |
| Lamp-works          | 8 Iron bars × 1.15ⁿ; offered from 150 ft                                                           | Each level turns 1 glowcap spore into 3 Lumen every second                                                         |
| Song-loom (Act III) | 25 Resonant crystal + 20 Silver bars × 1.15ⁿ; offered from 700 ft                                  | Weaves charms                                                                                                      |
| Lantern             | 1 Iron bar + 8 Lumen                                                                               | Light 1.5 warm; burns 0.05 Lumen a second while lit. At 0 Lumen every lantern goes dark                            |
| Support             | 4 Bricks                                                                                           | Stops small collapses within 4 tiles                                                                               |
| Iron pick           | 15 Iron bars                                                                                       | pickPower 5                                                                                                        |
| Rails               | 8 Iron bars per 10 tiles of mine depth, at most 80 (§9, ADR-021)                                   | carrierSpeed 8, capacity 25                                                                                        |
| Small collapse      | From 150 ft: 3% per tile opened when 14+ of the 25 tiles around it are open and no support is near | Up to 5 roof tiles fall as rubble. Never on the shaft, a worker or an object, and never if it would cut anyone off |
| Lantern moth        | 1/150 per lit lantern per second                                                                   | Darkens that lantern until tapped                                                                                  |

## §12 Act III: the Flooded Halls (v0)

| Thing            | Value                                                                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Water            | A level 0–8 on each open tile. It falls first, then spreads sideways to a neighbour at least 2 lower. At 4 or more a tile is flooded: nobody stands or digs in it, and reach goes around it |
| Silver ore       | Drops 2. Five ore make a bar                                                                                                                                                                |
| Pump             | 2 Silver bars + 6 Iron bars. Drains 12 water units a second from tiles within 6, topmost first                                                                                              |
| Cave eel         | 1/60 a second for each miner working beside flooded water. Stops that miner until tapped                                                                                                    |
| The drowned town | Four drowned houses on a street at the foot of the Halls. Each one drained (nothing inside flooded) tells a little more; Verses VI–VIII are carved on the back walls of the first three     |
| Old lamp         | Still burning in the drowned houses, light 0.8                                                                                                                                              |
| Silver pick      | 40 Silver bars. pickPower 8 (ADR-021)                                                                                                                                                       |
| Aquamarine pick  | 30 Aquamarine + 20 Silver bars. pickPower 12 (ADR-021, M3-09)                                                                                                                               |
| Bram’s pump crew | 8 Silver bars + 4 Iron bars. Picks up pumps standing dry, keeps 1 pump in hand, and sets pumps at the water nearest the shaft in the deepest 8 rows (canon §14)                             |

## §13 Act III: the Singing Geodes and the Song-loom (v0)

| Thing            | Value                                                                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Singing stone    | The Geodes' base rock. Hardness 17, needs the silver pick                                                                                                              |
| Resonant crystal | Rings around Verses IX and X                                                                                                                                           |
| Shard golem      | 20% chance when resonant crystal is mined. Stops miners within 4 until tapped 3 times                                                                                  |
| Song-loom        | 25 Resonant crystal + 20 Silver bars × 1.15ⁿ; offered from 700 ft. Weaves charms                                                                                       |
| Charm slots      | 1 + Song-loom levels, at most 4                                                                                                                                        |
| Weaving          | The nth charm costs 8 + 4n crystal and 6 silver bars. Each known verse weaves once. Woven charms are kept through a Cave-in; slots beyond the first empty at a Cave-in |

| Charm    | Verse | Effect                              |
| -------- | ----- | ----------------------------------- |
| Hush     | I     | Hand-mining +20%                    |
| Name     | II    | Miners dig 15% faster               |
| Lantern  | III   | Lanterns burn 25% less Lumen        |
| Candle   | IV    | The Lamp-works makes 25% more Lumen |
| Old Pick | V     | Every pick hits 20% harder          |
| Window   | VI    | Pumps drain 50% faster              |
| River    | VII   | Haulage carries 50% more            |
| Lamp     | VIII  | Torches burn 20% brighter           |
| Crystal  | IX    | Shard golems wake half as often     |
| Hollow   | X     | Cave-ins give 15% more Echoes       |

## §14 Hands about the village (ADR-020)

Each helper takes over a chore soon after it first appears, and stays through a Cave-in.

| Helper                     | Cost                        | Effect                                                                                                                                                      |
| -------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lamplighters (Wren)        | 8 Copper bars               | Miners light their own dark faces from stock. The village keeps 3 torches in hand, and 2 lanterns once there is a Lamp-works (only while Lumen is above 30) |
| Pell’s rounds I            | 12 Copper bars              | Pell clears the oldest pest every 4 s: beetles, moths, eels, cinder wisps, and one tap of a shard golem                                                     |
| Pell’s rounds II           | 12 Bronze bars              | Every 1.5 s                                                                                                                                                 |
| Bram’s props               | 10 Bricks                   | A roof about to fall is propped with a support from stock instead. The kiln keeps 2 supports in hand                                                        |
| Bram’s pump crew (Act III) | 8 Silver bars + 4 Iron bars | Moves pumps to the water and keeps one in hand (§12)                                                                                                        |
| Wren’s cold lamps (Act IV) | 6 Gold bars + 20 Bricks     | Sets a vent beside the hottest face nobody can work and keeps one in hand (§15). Offered once a face has been too hot                                       |
| Tansy’s hands              | 10 Copper bars              | Tansy reaps one ripe plot every 2 s, and can ring the feast bell when it is full (§17). Offered after the 5th harvest                                       |
| Rook’s axe                 | 12 Copper bars              | Rook fells old trees and replants, about once a second. He leaves any tree that has stood through a Cave-in (§17). Offered after the first felling          |

### 14.1 Feedback

- Every purchase raises a big toast naming the jump (pick ×power, haul ×speed, +1 miner).
- Passing your best depth after a Cave-in shakes the screen; again every 25 tiles.
- "Held back by" names the one thing slowing the village most: pests, haulage, light or nothing left to dig.
- The Village button shows a dot when something there is affordable; the Survey button glows when an Echo upgrade is affordable or a Cave-in is ready.
- Polish (ADR-022): a touch must be held 280 ms on a diggable tile before a drag digs. Edge arrows point at the nearest unfound verse within 24 tiles. Biome banners show for 3.5 s.
- Depth ruler bands (master palette): Topsoil & Stone #8A5A3B, Glowroot Caverns #1E6B66, The Flooded Halls #2A5E86, Singing Geodes #7FD6FF, Ember Deep #E0532F, The Hollow Heart #FFD65A.

## §15 Act IV: the Ember Deep, the Hollow Heart and the ending (v0, ADR-023)

**Heat** is worked out for a tile from the rock around it; nothing about it is saved.

`heat = min(0.6, 0.006 × (d − 250)) + Σ 0.12 × (1 − dist / 4) − cooling`, with d in tiles, summed over every ember ore and heartstone tile within 3 (square distance). Cooling is 0.9 within 5 tiles of a cooling vent and 0.4 beside standing water (level 4+). Never below 0.

| Heat      | Miners              | Foreman    |
| --------- | ------------------- | ---------- |
| under 0.5 | full speed          | full speed |
| 0.5 to 1  | ×0.6                | ×0.6       |
| 1 or more | won’t work the face | ×0.3       |

| Thing        | Cost                                               | Effect                                                                        |
| ------------ | -------------------------------------------------- | ----------------------------------------------------------------------------- |
| Cooling vent | 2 Gold bars + 10 Bricks                            | Takes 0.9 heat off every tile within 5                                        |
| Crystal pick | 80 Resonant crystal                                | pickPower 18. Opens basalt, ember ore and gold                                |
| Ember pick   | 40 Ember ore + 30 Gold bars                        | pickPower 27. Opens heartrock                                                 |
| Heart pick   | 60 Ember ore + 50 Gold bars                        | pickPower 40. The only pick that breaks heartstone, so Verse XII waits for it |
| Steam lift   | 30 Gold bars                                       | carrierSpeed 30, capacity 150                                                 |
| Cinder wisp  | 1/90 per miner per second at a face with heat 0.5+ | Stops that miner until tapped                                                 |

**Verse XI** is carved in the Ember Deep inside a ring of ember ore, so it is hot until a vent is set. **Verse XII** is in the Heartstone mound on the floor of the Hollow Heart.

**The ending.** Once Verse XII has been found in a run, the Foreman chooses, and either choice closes the cycle like a Cave-in (Echoes are paid as usual).

- _Seal the shaft:_ Endless Depth. The floor of the Heart opens 64 rows at a time whenever the mine comes within 24 rows of the bottom, through the biome looks of §2 in turn.
- _Sing the last verse:_ New Song+. Each song sung adds 50% to the Echoes from every Cave-in after it, and the verses come back sung: their two lines the other way round. The verse text itself never changes.

## §16 Sound (ADR-027)

All sound is synthesised; recipes live in `src/data/sounds.ts`.

| Cue                  | When                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------- |
| Chip                 | every 270 ms while the Foreman works a face (one swing)                                   |
| Break                | a tile breaks: soft earth, stone, ore (with a glint), crystal and singing stone (ringing) |
| Far break            | a miner breaks a tile on screen                                                           |
| Drop                 | ore into the pack; +2 semitones per Vein Rush link, at most +12                           |
| Smelt                | a bar from the forge (at most one every 1.8 s)                                            |
| Bought               | anything bought                                                                           |
| Refused, pest, pop   | a tap that can't be acted on; a pest appears on screen; a pest is cleared                 |
| Chest, record, biome | a chest opens; a new depth record; a new biome this run                                   |
| Collapse, Cave-in    | a roof fall; the Cave-in                                                                  |

**The Undersong** (one note per verse, I–XII, in Hz): 440, 523.25, 587.33, 659.25, 587.33, 783.99, 659.25, 880, 783.99, 659.25, 587.33, 440. Finding a verse plays the song so far, ending on that verse's note, at most five notes.

**The hum**: a root and a fifth under a 520 Hz low-pass, deepening with depth (gain 0.05 at the top of Topsoil to 0.16 at 381 tiles). Roots by biome: Holloway none, Topsoil 55, Glowroot 65.41, Flooded Halls 49, Singing Geodes 73.42, Ember Deep 46.25, Hollow Heart 55.

**Levels**: Sound and The hum are each Off, Low (0.35), Medium (0.7) or High (1). Defaults: Sound Medium, The hum Low.

## §17 Holloway above (v0, ADR-029)

Everything on the surface only adds: no hunger, no spoiling, no penalty for an empty larder. Numbers live in `src/data/surface.ts`.

### 17.1 Tansy's fields

| Thing         | Value                                                                      |
| ------------- | -------------------------------------------------------------------------- |
| Tansy arrives | with the first miner, bringing 1 free plot                                 |
| Plots         | up to 12, at columns 45–56; each after the free one costs 6 Copper × 1.15ⁿ |
| Barley        | ripens in 90 s; a harvest gives 3, or 6 reaped by hand (tap a ripe plot)   |
| Golden ear    | 1 in 25 ripe crops (seeded RNG); pays ×10                                  |
| Tansy’s hands | §14; one plot every 2 s                                                    |

### 17.2 The cookhouse and the feast bell

| Thing              | Cost                 | Effect                                             |
| ------------------ | -------------------- | -------------------------------------------------- |
| Miner’s bread      | 10 × 1.8ⁿ barley     | miners +5% a level, up to 3                        |
| Foreman’s porridge | 8 × 1.8ⁿ barley      | hand-mining +5% a level, up to 3                   |
| Cress soup         | 10 × 1.8ⁿ cress      | haulage +20% a level, up to 3                      |
| Pepper broth       | 10 × 1.8ⁿ firepepper | miners take 0.1 off a face's heat a level, up to 3 |

Meals reset on a Cave-in. The feast bell fills by 1 per harvest (10 for a golden ear) and needs 150, ×1.6 per feast this run. Ringing it gives 45 s of every worker ×2 (the village multiplier) with crops growing ×3.

### 17.3 Rook's woodlot

| Thing           | Value                                                                                 |
| --------------- | ------------------------------------------------------------------------------------- |
| Rook arrives    | at 20 tiles (80 ft), or at once to a woodlot that stood through the Cave-in           |
| Slots           | 5, at columns 1.5, 4, 58.5, 60.5, 62.5; Rook plants 2 free saplings in a bare woodlot |
| Saplings        | 3 Copper × 1.15ⁿ (n = trees standing)                                                 |
| Stages          | young at 3 min, grown at 8 min, old at 20 min                                         |
| Felling         | 0 / 4 / 12 / 40 timber for sapling / young / grown / old; ×2 by hand (tap a tree)     |
| Charcoal hearth | 20 × 1.8ⁿ timber; the forge works +25% a level, up to 2                               |
| Cottage         | 5 × 1.3ⁿ timber; miners +2% each, up to 5; drawn in a back row                        |
| Pit prop        | a support for 3 timber instead of bricks, whenever timber is the more plentiful       |

Hearth and cottage levels reset on a Cave-in. Trees do not.

### 17.4 Elders

A tree that stands through 3 Cave-ins is an elder: never felled, it drops 2 timber a minute. Its roots grow 6 rows (25 ft) per Cave-in it has stood through from the third on, leaning toward the shaft. Rock a root passes through takes 0.6 of its hardness, and copper and tin within 3 tiles of a root glint.

### 17.5 The cairn and the tally board

The cairn by the headframe holds a stone for each of the last 5 Cave-ins. Each stone is marked with how deep that run went and the change from the run before. The tally board shows goods per second from each source (your pick, the miners' ore as it comes up the shaft, chests, Tansy's fields, Rook's woodlot), averaged over the last 60 to 120 s. Rubble does not count. The tally is a reading and is not saved.

### 17.6 Act crops (ADR-030)

Each act's crop hangs off a system that act already has. Paddies and hot-beds are barley plots turned over to another crop (the last barley plot is used); they ripen in the same 90 s, yield 3 (6 by hand), never come up golden, and count 1 toward the feast bell.

| Act | Thing                           | Cost                                                                                      | Effect                                                                       |
| --- | ------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| II  | Root cellar under the cookhouse | 4 Iron bars + 6 Bricks to dig, then 10 spores to seed; offered once the Lamp-works stands | 1 spore every 5 s                                                            |
| III | Cress paddy                     | 3 Silver bars × 1.15ⁿ (n = paddies)                                                       | grows cress; each pump in the mine waters 2 paddies, the rest stand dry      |
| IV  | Firepepper hot-bed              | 3 Gold bars × 1.15ⁿ (n = hot-beds), up to 4; offered from the Ember Deep (250 tiles)      | grows firepeppers while ember ore is in hand; each harvest burns 1 ember ore |

The cellar, paddies, hot-beds, soup and broth reset on a Cave-in.

## §18 Touch, aim and zoom (v0, ADR-031, ADR-032)

Values live in `src/data/touch.ts`.

| Thing                          | Value                                                                                                                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loupe                          | circle of radius 58 CSS px, 104 CSS px above the finger (beside it near the top edge), ×2 magnification, gold outline on the aimed tile                                          |
| Crosshair                      | aims 64 CSS px above the finger                                                                                                                                                  |
| Smart dig snap                 | a tap on rock within 1 tile of workable ore the pick can break digs the ore; on a mouse, only when the clicked rock cannot be worked                                             |
| Vein long-press                | 600 ms held still on ore queues every 8-way connected ore tile the pick can break, nearest first, up to the dig-queue limit                                                      |
| Haptics (ms)                   | hold to dig 12 · Foreman breaks rock 6 · ore 14 · ore during a Vein Rush 24 · vein queued 24; one buzz a frame at most                                                           |
| Hover label                    | mouse rests 400 ms on a tile: name, Foreman seconds to break it now, the drop; or "Needs the X pick"                                                                             |
| Zoom steps (art px per CSS px) | phone ×1, ×2, ×3 (default ×2) · desktop ×2, ×3, ×4 (default ×3, ×4 above 1400 CSS px)                                                                                            |
| Zoom input                     | pinch ratio 1.3 per step · Ctrl + wheel 60 px per step · + and − keys; one step out past the farthest opens the Mountain view                                                    |
| Mountain view                  | 6 rows of sky to 6 rows below the deepest worker or dug tile; whole device pixels per tile; HUD margins 84 / 124 CSS px on phones, 16 from 900 CSS px wide; redrawn every 250 ms |

## §19 Shop and HUD (v0, ADR-033)

Values live in `src/data/ui.ts`.

| Thing        | Value                                                                                                                                                                                                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Buy steps    | ×1, ×10, Max (as many as can be paid for now, at most 1000) for miners, the whetstone, plots, saplings, meals, the hearth and cottages                                                                                                                                       |
| Ready in     | income of each resource averaged over the last 60 s of gains; "needs X" when none is coming in                                                                                                                                                                               |
| Shop order   | on each Village tab, cards with something you can buy now come first                                                                                                                                                                                                         |
| Ore heap     | ore waiting at the forge: sizes from 1, 15, 60, 200 ore; drawn at tile column 36.5 beside the headframe                                                                                                                                                                      |
| Bar stack    | bars in hand: heights from 1, 6, 25, 80 bars; drawn at tile column 16.6 beside the forge                                                                                                                                                                                     |
| Chip colours | copper #D9823B · tin #878E9A · bronze #B8902A · iron #A46D48 · silver #E8F4F0 · aquamarine #7FD6FF · crystal #C4F0FF · ember #E0532F · gold #FFD65A · heartstone #FF9A3C · spores #5FF0D8 · Lumen #FFF2A8 · rubble #6D7480 · brick #7A2A1E · barley #F2A35E · timber #6B4329 |

## §20 Memory and the deep game (v0, ADR-034)

Values live in `src/data/memory.ts`, `src/data/economy.ts` (`METALWORK`), `src/data/ui.ts` (`CEREMONY`) and `src/data/sounds.ts` (`CAVEIN_SONG`).

| Thing             | Value                                                                                                                                                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Metalwork         | repeatable, resets on a Cave-in, cost `base × 1.6^n` · Silvered bits: 1 silver bar, miners +5% each · Tuning fork: 2 crystal, hands +10% · Banked embers: 2 ember ore, miners +5% · Gilded handles: 1 gold bar, hands +10%                |
| Metalwork shown   | once the resource has been seen this run, or a level is bought                                                                                                                                                                            |
| Bunkhouse Roll    | Memory upgrade, 12 Echoes, after Bram's Ledger: after a Cave-in, one miner hires himself every 1.5 s while bars allow, up to last run's miner count                                                                                       |
| Ghost of last run | the run's deepest depth is kept once a minute, at most 480 minutes; the depth ruler marks where you were at this minute last run; passing it says "N min ahead of last cycle"                                                             |
| Foreman's lead    | miners within 6 tiles of the Foreman (Chebyshev) dig ×1.25, shown as a gold halo                                                                                                                                                          |
| Cave-in ceremony  | shaft folds 0–1.6 s · Echoes count up to 4.0 s, over this run's verse notes (start 1.6 s, 0.3 s apart) · stone drops on the cairn 4.9 s · "Last cycle you reached N ft" 5.0 s · ends 6.6 s · tap skips; reduced motion shows a still card |
| Act wait gate     | the Act II sim fails when any act's median longest wait with nothing to buy is over 10 minutes                                                                                                                                            |
