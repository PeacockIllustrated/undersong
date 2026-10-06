// Achievement names and what earns them (M5-03). Shown in the Survey Book and in a toast when earned.
import { ACH, type AchievementId } from '../data/achievements';
import { BIOMES } from '../data/biomes';
import { ftFromDepthTiles } from '../data/constants';

const reach = (b: number): string => `Reach ${BIOMES[b]!.name}, ${ftFromDepthTiles(BIOMES[b]!.d0)} ft down.`;

export const ACHIEVEMENTS: Record<AchievementId, { name: string; how: string }> = {
  verse1: { name: 'The first line', how: 'Find a verse.' },
  verse5: { name: 'Half a song', how: `Know ${ACH.verses[1]} verses.` },
  verse12: { name: 'The whole song', how: `Know all ${ACH.verses[2]} verses.` },
  caveIn1: { name: 'Let it fall', how: 'Cave in for the first time.' },
  caveIn10: { name: 'Old hands', how: `Cave in ${ACH.caveIns[1]} times.` },
  biome2: { name: 'Under the roots', how: reach(2) },
  biome3: { name: 'Lit windows', how: reach(3) },
  biome4: { name: 'The rock sings', how: reach(4) },
  biome5: { name: 'Warm to the touch', how: reach(5) },
  biome6: { name: 'The Heart', how: reach(6) },
  miners: { name: 'A full bunkhouse', how: `Have ${ACH.miners} miners at work at once.` },
  chests: { name: 'Light fingers', how: `Open ${ACH.chests} chests in one cycle.` },
  helpers: { name: 'Every hand', how: 'Hire every helper in the village.' },
  charms: { name: 'Woven', how: `Own ${ACH.charms} charms.` },
  echoes: { name: 'Long memory', how: `Earn ${ACH.echoes} Echoes over all your cycles.` },
  seal: { name: 'Keep the mountain', how: 'Seal the shaft at the Heart.' },
  sing: { name: 'Sing it again', how: 'Sing the last verse and begin New Song+.' },
  endless: { name: 'No floor', how: 'Open Endless Depth three times.' },
};

export const ACH_TEXT = {
  heading: 'Achievements',
  count: (n: number, of: number) => `${n} of ${of}`,
  toast: 'Achievement',
  locked: 'Not yet',
} as const;
