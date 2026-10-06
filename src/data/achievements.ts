// Achievements (M5-03, ADR-025): badges earned once and kept for good. Thresholds live here, names in src/story.
export type AchievementId =
  | 'verse1'
  | 'verse5'
  | 'verse12'
  | 'caveIn1'
  | 'caveIn10'
  | 'biome2'
  | 'biome3'
  | 'biome4'
  | 'biome5'
  | 'biome6'
  | 'miners'
  | 'chests'
  | 'helpers'
  | 'charms'
  | 'echoes'
  | 'seal'
  | 'sing'
  | 'endless';

export const ACH = {
  verses: [1, 5, 12],
  caveIns: [1, 10],
  /** Miners at work at once. */
  miners: 12,
  /** Chests opened in one cycle. */
  chests: 10,
  /** Charms owned. */
  charms: 5,
  /** Echoes ever earned. */
  echoes: 500,
  /** Rows of Endless Depth opened (three openings). */
  endlessRows: 192,
} as const;

export const ACHIEVEMENT_IDS: readonly AchievementId[] = [
  'verse1',
  'biome2',
  'caveIn1',
  'miners',
  'biome3',
  'verse5',
  'chests',
  'biome4',
  'helpers',
  'charms',
  'caveIn10',
  'biome5',
  'echoes',
  'biome6',
  'verse12',
  'seal',
  'sing',
  'endless',
];
