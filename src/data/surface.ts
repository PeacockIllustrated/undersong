// Holloway above: Tansy's fields, the cookhouse and Rook's woodlot. canon §17 (ADR-029)
import type { Cost } from './items';

/** canon §17.1 Tansy's fields. Plots line the grass east of the shaft. */
export const FIELDS = {
  /** First plot column; plot i sits at column plotX0 + i. */
  plotX0: 45,
  maxPlots: 12,
  /** Each plot after the free one costs this × 1.15ⁿ (canon §4.1), n = plots already owned. */
  plotCost: { res: 'copperBar', n: 6 } as Cost,
  ripenS: 90,
  /** Barley from one harvest by Tansy; tapping a ripe plot yourself pays handMult times as much. */
  yield: 3,
  handMult: 2,
  goldenChance: 1 / 25,
  goldenMult: 10,
  /** Tansy's hands: seconds between harvests on her walk. */
  tansyEveryS: 2,
  /** Harvests (in any run) before Tansy's hands is offered. */
  handsAfter: 5,
} as const;

export type MealId = 'bread' | 'porridge';
export interface MealDef {
  id: MealId;
  name: string;
  text: string;
  /** Barley for level n is base × growth^n. */
  base: number;
  growth: number;
  /** Bonus per level: miners for bread, hand-mining for porridge. */
  per: number;
  /** Most levels in one run: the cookhouse only feeds so many. */
  max: number;
}
/** canon §17.2 the cookhouse. Levels last the run, like the whetstone. */
export const MEALS: readonly MealDef[] = [
  { id: 'bread', name: 'Miner’s bread', text: 'Miners dig faster', base: 10, growth: 1.8, per: 0.05, max: 3 },
  {
    id: 'porridge',
    name: 'Foreman’s porridge',
    text: 'You dig faster',
    base: 8,
    growth: 1.8,
    per: 0.05,
    max: 3,
  },
];

/** canon §17.2 the feast bell: crops harvested fill it; ringing it doubles every worker for a while. */
export const FEAST = {
  need: 150,
  /** Each feast this run raises the next one's need by this factor. */
  growth: 1.6,
  seconds: 45,
  mult: 2,
  /** Crops grow this much faster during a feast. */
  grow: 3,
  /** A golden ear counts as this many crops toward the bell. */
  golden: 10,
} as const;

/** canon §17.3 Rook's woodlot. Slots are tile columns (fractional: trees are two tiles wide). */
export const WOODLOT = {
  /** Depth (tiles) that brings Rook up the valley road, the same as the Kiln. */
  unlockD: 20,
  slots: [1.5, 4, 58.5, 60.5, 62.5] as readonly number[],
  saplingCost: { res: 'copperBar', n: 3 } as Cost,
  /** Saplings Rook plants for free when he arrives, if the woodlot is bare. */
  freeSaplings: 2,
  /** Age (s) to reach young, grown and old. */
  stageS: [180, 480, 1200] as readonly number[],
  /** Timber for felling a sapling, young, grown or old tree. */
  chop: [0, 4, 12, 40] as readonly number[],
  handMult: 2,
  /** A tree that stands through this many Cave-ins becomes an elder: never felled, drops timber. */
  elderAfter: 3,
  elderTimberPerMin: 2,
} as const;

export type WoodBuyId = 'hearth' | 'cottage';
export interface WoodBuyDef {
  id: WoodBuyId;
  name: string;
  text: string;
  base: number;
  growth: number;
  per: number;
  /** Most levels in one run. */
  max: number;
}
/** canon §17.3 what timber buys. Levels reset on a Cave-in. */
export const WOOD_BUYS: readonly WoodBuyDef[] = [
  {
    id: 'hearth',
    name: 'Charcoal hearth',
    text: 'The forge works faster',
    base: 20,
    growth: 1.8,
    per: 0.25,
    max: 2,
  },
  { id: 'cottage', name: 'Cottage', text: 'Miners dig faster', base: 5, growth: 1.3, per: 0.02, max: 5 },
];

/** canon §17.3 pit props: a support from timber instead of bricks. */
export const PIT_PROP: Cost = { res: 'timber', n: 3 };

/** canon §17.4 an elder's roots: they grow into the mine with each Cave-in and soften the rock they pass. */
export const ROOTS = {
  /** Rows of root per Cave-in the elder has stood through (25 ft). */
  rowsPerCaveIn: 6,
  /** Rock a root passes through takes this fraction of its hardness. */
  soften: 0.6,
  /** Ore within this many tiles of a root glints. */
  glintRange: 3,
} as const;
