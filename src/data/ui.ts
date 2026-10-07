// Numbers for the shop UI and the Cave-in. canon §19, §20.
import type { ResKey } from './resources';

/** canon §19 M8-03: income for "ready in" is averaged over this many seconds of gains. */
export const RATE_WINDOW_S = 60;

/** canon §19 M8-03: the bulk-buy steps on the Village sheet. */
export const BULK_STEPS = [1, 10, 'max'] as const;

/**
 * canon §19 M8-04: ore in hand at which the heap by the headframe shows each of its four sizes, and bars in hand
 * for each height of the stack by the forge. Where they stand (tile columns) is render layout.
 */
export const HEAP = {
  oreSteps: [1, 15, 60, 200],
  barSteps: [1, 6, 25, 80],
  heapX: 36.5,
  barsX: 16.6,
} as const;

/** canon §19 M8-06: each resource chip's edge, in its ore's colour, from the master palette. */
export const RES_COLOUR: Partial<Record<ResKey, string>> = {
  copperOre: '#D9823B',
  copperBar: '#D9823B',
  tinOre: '#878E9A',
  tinBar: '#878E9A',
  bronzeBar: '#B8902A',
  ironOre: '#A46D48',
  ironBar: '#A46D48',
  silverOre: '#E8F4F0',
  silverBar: '#E8F4F0',
  aquamarine: '#7FD6FF',
  crystal: '#C4F0FF',
  emberOre: '#E0532F',
  goldOre: '#FFD65A',
  goldBar: '#FFD65A',
  heartstone: '#FF9A3C',
  spores: '#5FF0D8',
  lumen: '#FFF2A8',
  rubble: '#6D7480',
  brick: '#7A2A1E',
  barley: '#F2A35E',
  timber: '#6B4329',
};

/**
 * canon §20 M9-04: the Cave-in's beats, in ms from the tap. The shaft folds in, the Echoes count up over the run's
 * verses, a stone drops on the cairn, then the last line; the run opens at `end`.
 */
export const CEREMONY = { fold: 1600, count: 4000, stone: 4900, line: 5000, end: 6600 } as const;
