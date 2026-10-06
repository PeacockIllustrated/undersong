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
}
export const HAULS: readonly HaulDef[] = [
  { name: 'Rope haul', speed: 1, capacity: 5, cost: [] },
  { name: 'Winch lift', speed: 3, capacity: 10, cost: [{ res: 'copperBar', n: 40 }] },
];

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
