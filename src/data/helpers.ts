// Hands about the village: each one takes over a chore soon after it first appears. canon §14 (ADR-020)
import type { Cost } from './items';
import type { ResKey } from './resources';

export type HelperId = 'lamps' | 'pell' | 'dog' | 'props' | 'pumps' | 'vents' | 'tansy' | 'rook';

export interface HelperDef {
  id: HelperId;
  name: string;
  /** Who does it, for the portrait. */
  who: 'pell' | 'bram' | 'wren' | 'tansy' | 'rook';
  /** What it takes off your hands, shown before you buy it. */
  text: string;
  /** Cost of each level; the last entry is the top level. */
  levels: Cost[][];
}

export const HELPERS: readonly HelperDef[] = [
  {
    id: 'lamps',
    name: 'Lamplighters',
    who: 'wren',
    text: 'Miners light their own faces from your stock, and the village makes torches (and lanterns, once there is a Lamp-works) whenever you run low.',
    levels: [[{ res: 'copperBar', n: 8 }]],
  },
  {
    id: 'pell',
    name: 'Pell’s rounds',
    who: 'pell',
    text: 'Pell walks the mine and shoos pests for you.',
    levels: [[{ res: 'copperBar', n: 12 }], [{ res: 'bronzeBar', n: 12 }]],
  },
  {
    id: 'dog',
    name: 'Pell’s dog',
    who: 'pell',
    text: 'Biscuit sniffs out any old chest near you, fetches it up and drops what was in it at your feet.',
    levels: [[{ res: 'copperBar', n: 15 }]],
  },
  {
    id: 'props',
    name: 'Bram’s props',
    who: 'bram',
    text: 'Bram props any roof about to fall with a support from stock, and the kiln makes supports whenever you run low.',
    levels: [[{ res: 'brick', n: 10 }]],
  },
  {
    id: 'pumps',
    name: 'Bram’s pump crew',
    who: 'bram',
    text: 'The crew carries pumps to wherever the water is, picks up the ones left standing dry, and makes a new pump whenever you have none in hand.',
    levels: [
      [
        { res: 'silverBar', n: 8 },
        { res: 'ironBar', n: 4 },
      ],
    ],
  },
  {
    id: 'vents',
    name: 'Wren’s cold lamps',
    who: 'wren',
    text: 'Wren’s people set a cooling vent wherever a face is too hot to work, and make a new vent whenever you have none in hand.',
    levels: [
      [
        { res: 'goldBar', n: 6 },
        { res: 'brick', n: 20 },
      ],
    ],
  },
  {
    id: 'tansy',
    name: 'Tansy’s hands',
    who: 'tansy',
    text: 'Tansy reaps every ripe plot on her rounds and sows it again. Reaping by hand still pays double.',
    levels: [[{ res: 'copperBar', n: 10 }]],
  },
  {
    id: 'rook',
    name: 'Rook’s axe',
    who: 'rook',
    text: 'Rook fells trees once they are old and plants a sapling in each stump. He leaves any tree that has stood through a Cave-in to grow.',
    levels: [[{ res: 'copperBar', n: 12 }]],
  },
];

/** canon §14 numbers. */
export const HELPER_FX = {
  /** Seconds between Pell clearing a pest, by level. */
  pellEvery: [4, 1.5],
  /** Stock the village keeps topped up. */
  keepTorches: 3,
  keepLanterns: 2,
  keepSupports: 2,
  /** Pumps the crew keeps in hand, and how many rows above the deepest open tile it looks for water. */
  keepPumps: 1,
  pumpRows: 8,
  /** Vents Wren's people keep in hand. */
  keepVents: 1,
  /** Lumen the village keeps in hand before it spends any on a lantern. */
  lanternLumenFloor: 30,
};

/** canon §4.12 Homecoming: until this run is this deep (fraction of your best), the village works this much faster. */
export const HOMECOMING = { frac: 0.6, mult: 3 };

/** canon §4.13 Verse power: every verse ever known speeds the whole village. */
export const VERSE_POWER = 0.05;

/** canon §4.13 Verse cache: each verse found in a run pays out bars of its biome's metal (verse index 0–11). */
export const VERSE_CACHE: readonly { res: ResKey; n: number }[] = [
  { res: 'copperBar', n: 10 },
  { res: 'copperBar', n: 15 },
  { res: 'ironBar', n: 8 },
  { res: 'ironBar', n: 10 },
  { res: 'ironBar', n: 12 },
  { res: 'silverBar', n: 8 },
  { res: 'silverBar', n: 10 },
  { res: 'silverBar', n: 12 },
  { res: 'silverBar', n: 15 },
  { res: 'silverBar', n: 20 },
  { res: 'goldBar', n: 15 },
  { res: 'goldBar', n: 25 },
];
