# Undersong canon

This file lists every name, number, colour and line of verse the game uses. **If a value isn't in this file, it doesn't exist yet.** Add it here (and to `src/data`) in the same commit you first use it. Values marked *v0* are first-pass and are expected to be tuned with `npm run sim`.

---

## §1 Names

| Thing | Canon name | Never call it |
|---|---|---|
| The game | Undersong (working title) | — |
| Village | Holloway | the town, the base |
| Player | the Foreman | the player character, hero |
| Lamplighter | Old Wren | Wren the lamplighter (fine in prose) |
| Child | Pell | — |
| Smith | Bram | — |
| Prestige | the Cave-in | reset, rebirth, ascension |
| Prestige currency | Echoes | points, souls |
| Prestige screen | the Survey Book | prestige menu |
| Light resource | Lumen | mana, energy |
| Story collectibles | Verses (I–XII, Roman numerals) | lore, notes |
| Buildings | Bunkhouse, Forge, Lamp-works, Kiln, Song-loom | — |

## §2 Biomes

One tile is **4 ft** deep. Depths are measured from the grass line.

| # | Biome | Depth (ft) | Act | Main ore | New system | Threat | Verses |
|---|---|---|---|---|---|---|---|
| 0 | Holloway | 0 | I | — | Buildings | — | — |
| 1 | Topsoil & Stone | 0–150 | I | Copper, Tin | Miners, Forge, rope | Burrow beetles | I–II |
| 2 | Glowroot Caverns | 150–400 | II | Iron, Glowcap spores | Lumen, lanterns, rails, supports | Lantern moths | III–V |
| 3 | The Flooded Halls | 400–700 | III | Silver, Aquamarine | Water, pumps | Cave eels | VI–VIII |
| 4 | Singing Geodes | 700–1000 | III | Resonant crystal | Song-loom, charms | Shard golems | IX–X |
| 5 | Ember Deep | 1000–1400 | IV | Ember ore, Gold | Heat, cooling | Cinder wisps | XI |
| 6 | The Hollow Heart | 1400+ | IV | Heartstone | Ending, Endless Depth | — | XII |

## §3 Verses

These are the final text. Each verse is two lines in folk metre. Don't paraphrase them.

| # | Biome | Text |
|---|---|---|
| I | Topsoil & Stone | Hush now, the hollow is calling you home, / down past the roots where the copper veins roam. |
| II | Topsoil & Stone | Dig with your hands and dig with your name; / the stone will forget, but the song stays the same. |
| III | Glowroot | Down where the lanterns forget their light, / the stone remembers, the stone holds tight. |
| IV | Glowroot | Glowcaps are candles that nobody set; / someone was here, and they’re here with you yet. |
| V | Glowroot | Old picks are waiting with marks like your own; / you held them before, in the dark, all alone. |
| VI | Flooded Halls | Under the water a village lies sleeping; / every lit window is one we’re still keeping. |
| VII | Flooded Halls | Hush, little foreman, the river runs slow; / it carried us here a long time ago. |
| VIII | Flooded Halls | Every street drowned is a street that we knew; / every lost house had a lamp burning through. |
| IX | Singing Geodes | Crystal will carry what voices let fall; / sing to the stone and the stone sings it all. |
| X | Singing Geodes | We sealed it and slept, and we woke, and we came; / the mountain was hollow, and we were the same. |
| XI | Ember Deep | Heat in the deep where the old fires keep; / some things are buried that never would sleep. |
| XII | Hollow Heart | Here is the heart, and the heart is a song; / sing it, remember, you’ve known it all along. |

**Endings.** *Seal the shaft* leads to Endless Depth. *Sing the last verse* leads to New Song+.

## §4 Formulas (v0)

| § | Name | Formula |
|---|---|---|
| 4.1 | Building cost | `cost(n) = base × 1.15^n` (n = number already owned) |
| 4.2 | Rock hardness at depth | `H(d) = H_material × (1 + d_ft / 60)^1.3` |
| 4.3 | Echo gain on Cave-in | `floor( sqrt(maxDepth_ft / 10) × (1 + 0.25 × versesFoundThisRun) )` |
| 4.4 | Miner output | `ore_per_s = pickPower × lightFactor / H(d)` |
| 4.5 | Light factor | `L ≥ 0.6 → 1.0`, `0.3 ≤ L < 0.6 → 0.7`, `L < 0.3 → 0.4` |
| 4.6 | Hand-mining time per tile | `seconds = H(d) / (pickPower × 2.5 × veinRushMult)` |
| 4.7 | Vein Rush | `mult = min(5, 1 + 0.25 × chain)`; chain resets after 1.2 s without mining a connected ore tile |
| 4.8 | Offline gain | `rate × min(t, cap) × eff`; base cap 8 h, eff 0.5; max cap 24 h, eff 1.0 |
| 4.9 | Haul throughput | `ore_per_s_max = carrierSpeed_tiles_per_s × capacity / shaftDepth_tiles` |
| 4.10 | Cave-in unlock | `maxDepth_ft ≥ 300` **and** Verse II found |

## §5 Pacing targets

These are for an engaged player mixing active and idle play. The balance sim must land within ±15% of each target.

| Milestone | Target |
|---|---|
| First miner hired | 2 min |
| First bar smelted | 5 min |
| Verse I found | 10 min |
| 150 ft (Glowroot entrance visible) | 30 min |
| First Cave-in available | 45 min |
| Echoes from a typical first Cave-in | 6–10 |
| Glowroot cleared (Act II end) | 4 h |
| Act III end | 9 h |
| Ending reached | 14 h |

## §6 Art

### 6.1 Master palette (32)

These are the only colours allowed in sprites.

| Ramp | Colours |
|---|---|
| Earth | `#3A2A20` `#6B4329` `#8A5A3B` `#A46D48` |
| Grass | `#3A7A2C` `#4F9A3A` `#6CC04A` |
| Stone | `#3F444E` `#555B66` `#6D7480` `#878E9A` |
| Slate | `#262940` `#373A52` `#4B4F6B` `#5F6487` |
| Copper | `#9C5420` `#D9823B` `#F2A35E` |
| Gold | `#B8902A` `#FFD65A` `#FFF2A8` |
| Glowcap | `#1E6B66` `#5FF0D8` `#B9FFF3` |
| Crystal | `#2A5E86` `#7FD6FF` `#C4F0FF` |
| Ember | `#7A2A1E` `#E0532F` `#FF9A3C` |
| Night | `#141A33` `#E8F4F0` |

Sky colours and UI panel colours (`#5AA8DA` to `#BFE6F5`, and the slot navy `rgba(40,56,120,.72)` with border `#8DA2E8`) belong to the renderer and the UI. They are not sprite colours.

### 6.2 Biome palettes

| Biome | Colours (6) |
|---|---|
| Holloway | sky `#3B6E9C` `#A6D9F2`, `#6CC04A` `#4F9A3A` `#8A5A3B`, roof `#7A3B2E` |
| Topsoil & Stone | `#8A5A3B` `#6B4329` `#6D7480` `#555B66` `#D9823B` `#F2A35E` |
| Glowroot | `#4B4F6B` `#373A52` `#1E6B66` `#5FF0D8` `#B9FFF3` `#878E9A` |
| Flooded Halls | `#262940` `#373A52` `#5F6487` `#7FD6FF` `#878E9A` `#E8F4F0` |
| Singing Geodes | `#262940` `#2A5E86` `#7FD6FF` `#C4F0FF` `#4B4F6B` `#FFF2A8` |
| Ember Deep | `#3A2A20` `#7A2A1E` `#E0532F` `#FF9A3C` `#FFD65A` `#373A52` |
| Hollow Heart | `#141A33` `#262940` `#4B4F6B` `#FFD65A` `#FFF2A8` `#B9FFF3` |

(Holloway's sky and roof colours are renderer or prop colours, which §6.1 allows.)

### 6.3 Sizes and scale

The base tile is 16×16, characters are 16×24 and items are 16×16. HUD icons are 8×8 or 16×16. Render scale is ×2, ×3 or ×4 (integers only). Animation runs at 8–12 fps.

## §7 Lighting constants

| Constant | Value |
|---|---|
| Channels | warm (sky, torch, lantern, ember), cool (glowcap, crystal) |
| Decay through air | 0.085 per tile |
| Decay through solid | 0.26 per tile |
| Sky light | 1.0 at and above the grass line |
| Torch | 1.0 warm, flicker ±6% (cosmetic only, never affects the sim) |
| Lantern | 1.0 warm, costs Lumen upkeep (§9) |
| Glowcap | 0.85 cool |
| Crystal | 0.9 cool |
| Darkness overlay | `rgba(6,8,18, (1 − L) × 0.94)` |
| Cool tint | `rgba(70,230,220, cool × 0.16)` underground only |
| Warm tint | `rgba(255,170,70, warm × 0.07)` underground only |

The sim uses the light value **without flicker**. Flicker is applied in render only.

## §8 Materials (v0)

| Material | H_material | Drops | Biome |
|---|---|---|---|
| Dirt | 1 | — | 1 |
| Stone | 3 | — | 1–2 |
| Copper ore | 4 | 1 Copper ore | 1 |
| Tin ore | 4 | 1 Tin ore | 1 |
| Slate | 6 | — | 2+ |
| Iron ore | 8 | 1 Iron ore | 2 |
| Glowcap cluster | 2 | 2 Glowcap spores | 2 |
| Silver ore | 14 | 1 Silver ore | 3 |
| Aquamarine | 18 | 1 Aquamarine | 3 |
| Resonant crystal | 24 | 1 Resonant crystal | 4 |
| Ember ore | 32 | 1 Ember ore | 5 |
| Gold ore | 28 | 1 Gold ore | 5 |
| Heartstone | 60 | 1 Heartstone | 6 |

## §9 Buildings and items: Act I (v0)

| Thing | Base cost | Effect |
|---|---|---|
| Miner (Bunkhouse) | 15 Copper bars, ×1.15 per miner | Mines one assigned face |
| Forge | free at start | Turns 5 ore into 1 bar every 2 s. Copper, tin and bronze (2 copper bars + 1 tin bar) |
| Wooden pick | start | pickPower 1 |
| Copper pick | 10 Copper bars | pickPower 2 |
| Bronze pick | 25 Bronze bars | pickPower 3 |
| Rope haul | start | carrierSpeed 1 tile/s, capacity 5 |
| Winch lift | 40 Copper bars | carrierSpeed 3 tiles/s, capacity 10 |
| Rails (Act II) | 8 Iron bars per 10 tiles | carrierSpeed 8 tiles/s, capacity 25 |
| Torch | 1 Copper bar for 3 | Light 1.0, no upkeep, radius limited by decay |

## §10 Echo upgrades: M1 set (v0)

| Upgrade | Branch | Cost (Echoes) | Effect |
|---|---|---|---|
| Steady Hands | Hands | 1 | Hand-mining +25% |
| Cheap Bunks | Hands | 2 | Miner cost −10% |
| Lamplit | Lamps | 2 | Torches decay 15% slower |
| Remembered Rope | Memory | 3 | Start each run with the Winch lift |
| Pell’s Hum | Memory | 5 | The nearest unfound verse glints when within 20 tiles |
