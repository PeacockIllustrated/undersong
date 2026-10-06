// Act I economy. canon §4, §9, §10. Every number here is mirrored in canon.
import type { ResKey } from './resources';
import type { Cost } from './items';

/** canon §4.1 cost growth per owned. */
export const COST_GROWTH = 1.15;

/** canon §9 Miner (Bunkhouse). */
export const MINER_BASE: Cost = { res: 'copperBar', n: 15 };

/** canon §9 Forge: 5 ore → 1 bar every 2 s. Bronze is 2 copper bars + 1 tin bar. */
export const FORGE = {
  orePerBar: 5,
  seconds: 2,
  bronze: { copperBar: 2, tinBar: 1 },
} as const;

export type Recipe = 'auto' | 'copper' | 'tin' | 'bronze' | 'iron' | 'silver' | 'gold';

export const SMELT: Partial<Record<Recipe, { ore: ResKey; bar: ResKey }>> = {
  copper: { ore: 'copperOre', bar: 'copperBar' },
  tin: { ore: 'tinOre', bar: 'tinBar' },
  iron: { ore: 'ironOre', bar: 'ironBar' },
  silver: { ore: 'silverOre', bar: 'silverBar' },
  gold: { ore: 'goldOre', bar: 'goldBar' },
};

/** canon §9 haulage tiers. Rails arrive in Act II. */
export interface HaulDef {
  name: string;
  speed: number;
  capacity: number;
  cost: Cost[];
  /** Cost is per 10 tiles of shaft depth. */
  perTenTiles?: boolean;
}

/** Village buildings bought in levels. canon §11. Each level costs base × 1.15ⁿ. */
export type BuildingId = 'lampworks' | 'kiln' | 'songloom';
export interface BuildingDef {
  id: BuildingId;
  name: string;
  sprite: string;
  cost: Cost[];
  text: string;
  /** Depth (tiles) the village must have reached before it is offered. */
  unlockD: number;
}
export const BUILDINGS: readonly BuildingDef[] = [
  {
    id: 'kiln',
    name: 'Kiln',
    sprite: 'kiln',
    cost: [{ res: 'copperBar', n: 20 }],
    text: 'Bakes rubble into bricks for supports.',
    unlockD: 20,
  },
  {
    id: 'lampworks',
    name: 'Lamp-works',
    sprite: 'lampworks',
    cost: [{ res: 'ironBar', n: 8 }],
    text: 'Old Wren turns glowcap spores into Lumen.',
    unlockD: 38,
  },
  {
    id: 'songloom',
    name: 'Song-loom',
    sprite: 'songloom',
    cost: [
      { res: 'crystal', n: 25 },
      { res: 'silverBar', n: 20 },
    ],
    text: 'Weaves resonant crystal into charms.',
    unlockD: 175,
  },
];

/** canon §11 Kiln: per level, 4 rubble → 1 brick every 3 s. */
export const KILN = { rubble: 4, seconds: 3 };

/** canon §11 Lamp-works: per level, 1 spore → 3 Lumen every second. Lanterns burn Lumen while lit. */
export const LAMPWORKS = { spores: 1, lumen: 3, seconds: 1, upkeepPerLantern: 0.05 };

/** canon §11 crafts. */
export const CRAFTS = {
  lantern: {
    cost: [
      { res: 'ironBar', n: 1 },
      { res: 'lumen', n: 8 },
    ] as Cost[],
    makes: 1,
  },
  support: { cost: [{ res: 'brick', n: 4 }] as Cost[], makes: 1 },
  // mostly iron: the first pump has to be affordable from the silver above the waterline
  pump: {
    cost: [
      { res: 'silverBar', n: 2 },
      { res: 'ironBar', n: 6 },
    ] as Cost[],
    makes: 1,
  },
  vent: {
    cost: [
      { res: 'goldBar', n: 4 },
      { res: 'brick', n: 10 },
    ] as Cost[],
    makes: 1,
  },
} as const;
export type CraftId = keyof typeof CRAFTS;

/** canon §11 small collapses below Topsoil: chance per mined tile when the open space around it is wide and unsupported. */
export const COLLAPSE = { fromD: 38, chance: 0.03, openAround: 14, radius: 2, fill: 5 };

/** canon §11 lantern moths: chance per lit lantern per second; a moth darkens its lantern until tapped. */
export const MOTHS = { chancePerSec: 1 / 150 };

/** Echoes earned (lifetime) speed every worker by this much each. canon §4.11 */
export const ECHO_POWER = 0.03;
/** Rails are charged for at most this many 10-tile lots, so a village reaching the Halls can still afford them (ADR-021). */
export const RAIL_MAX_LOTS = 10;

export const HAULS: readonly HaulDef[] = [
  { name: 'Rope haul', speed: 1, capacity: 5, cost: [] },
  { name: 'Winch lift', speed: 3, capacity: 10, cost: [{ res: 'copperBar', n: 40 }] },
  // canon §9: rails cost 8 iron bars per 10 tiles of shaft (charged on the shaft depth when built), at most 10 lots (ADR-021)
  { name: 'Rails', speed: 8, capacity: 25, cost: [{ res: 'ironBar', n: 8 }], perTenTiles: true },
  { name: 'Water lift', speed: 15, capacity: 60, cost: [{ res: 'silverBar', n: 40 }] },
  { name: 'Steam lift', speed: 30, capacity: 150, cost: [{ res: 'goldBar', n: 40 }] },
];

/** canon §9.2 Whetstone (ADR-020): a cheap, always-there buy. Each level sharpens the Foreman's hand-mining. */
export const WHETSTONE = { base: 2, growth: 1.45, perLevel: 0.12 };

/** canon §9 Torch: 1 copper bar makes 3. */
export const TORCH_CRAFT = { cost: { res: 'copperBar', n: 1 } as Cost, makes: 3 };

/** canon §4.7 Vein Rush. */
export const VEIN_RUSH = { step: 0.25, max: 5, windowMs: 1200 };

/** canon §4.10 Cave-in unlock. */
export const CAVE_IN = { minFt: 300, verse: 1 };

/** canon §4.3 Echo gain. */
export const ECHO = { divisor: 10, perVerse: 0.25 };

/** Burrow beetles (ADR-008): chance per dark miner per second, and the light below which they come. */
export const PESTS = { beetleChancePerSec: 1 / 90, darkBelow: 0.3, maxPerMiner: 1 };

/** Old chests: what they can hold (one roll). */
export const CHEST_LOOT: readonly { res: ResKey; lo: number; hi: number }[] = [
  { res: 'copperBar', lo: 3, hi: 8 },
  { res: 'tinBar', lo: 2, hi: 5 },
  { res: 'torch', lo: 3, hi: 6 },
];

/** Miners look for exposed ore within this many tiles of the dug network's tiles they can reach. */
export const MINER_SEARCH = 24;
