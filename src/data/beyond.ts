// M11 Beyond the song: Endless Depth markers, the deep picks, Auto Cave-in and the keys of New Song+. canon §22
import type { Cost } from './items';
import type { ResKey } from './resources';

/** canon §22.1 A marker every `everyD` tiles (500 ft) below the Heart floor. Marker k pays Echoes and gold, ×grow each time. */
export const ENDLESS_MARK = { everyD: 125, echoes: 8, gold: 40, grow: 1.5 };

/**
 * canon §22.2 Deep picks: past the Heart pick, deep pick n (from 1) can be made once marker n has been reached this run.
 * Each doubles pick power. Cost of pick n is `cost × grow^(n−1)`, rounded.
 */
export const DEEP_PICK: { mult: number; grow: number; cost: Cost[] } = {
  mult: 2,
  grow: 2,
  cost: [
    { res: 'crystal', n: 100 },
    { res: 'goldBar', n: 60 },
  ],
};

/** canon §22.3 Auto Cave-in: caves in once the Echoes on offer have not risen for `stallMs` of run time. */
export const AUTO_CAVEIN = { stallMs: 180_000 };

export type KeyId = 'wet' | 'hot' | 'rich' | 'hard';

/** canon §22.4 The keys of New Song+: each sung song sets the next mountain in one of these, and it holds until the next song. */
export const KEYS: readonly KeyId[] = ['wet', 'hot', 'rich', 'hard'];

export const KEY_FX = {
  /** Rain comes this much more often (gaps ÷) and lasts this much longer. */
  wet: { rainOften: 2, rainLong: 2 },
  /** Heat starts this many tiles higher; ember ore and gold ore drop ×drop. */
  hot: { earlierD: 60, drop: 2, res: ['emberOre', 'goldOre'] as readonly ResKey[] },
  /** Every ore drops ×drop. */
  rich: {
    drop: 2,
    res: [
      'copperOre',
      'tinOre',
      'ironOre',
      'silverOre',
      'aquamarine',
      'crystal',
      'emberOre',
      'goldOre',
      'heartstone',
    ] as readonly ResKey[],
  },
  /** Everyone digs ×dig (the rock is harder); Cave-ins give ×echoes. */
  hard: { dig: 0.8, echoes: 1.5 },
};
