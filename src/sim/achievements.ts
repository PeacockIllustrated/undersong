// Achievements (M5-03, ADR-025): checked about once a second, earned once, and kept in story.ever as "ach:<id>",
// which already survives a Cave-in and is already in the save, so no save change is needed.
import { ACH, ACHIEVEMENT_IDS, type AchievementId } from '../data/achievements';
import { BIOMES } from '../data/biomes';
import { HELPERS } from '../data/helpers';
import type { Game } from './game';
import type { GameState } from './state';

const known = (s: GameState): number => s.verses.known.filter(Boolean).length;
const reached = (s: GameState, biome: number): boolean =>
  Math.max(s.stats.bestDepthD, s.stats.maxDepthD) >= BIOMES[biome]!.d0;

export const EARNED: Record<AchievementId, (s: GameState) => boolean> = {
  verse1: (s) => known(s) >= ACH.verses[0],
  verse5: (s) => known(s) >= ACH.verses[1],
  verse12: (s) => known(s) >= ACH.verses[2],
  caveIn1: (s) => s.stats.caveIns >= ACH.caveIns[0],
  caveIn10: (s) => s.stats.caveIns >= ACH.caveIns[1],
  biome2: (s) => reached(s, 2),
  biome3: (s) => reached(s, 3),
  biome4: (s) => reached(s, 4),
  biome5: (s) => reached(s, 5),
  biome6: (s) => reached(s, 6),
  miners: (s) => s.miners.length >= ACH.miners,
  chests: (s) => s.stats.chests >= ACH.chests,
  helpers: (s) => HELPERS.every((h) => (s.helpers[h.id] ?? 0) > 0),
  charms: (s) => s.charms.owned.length >= ACH.charms,
  echoes: (s) => s.echoesEver.gte(ACH.echoes),
  seal: (s) => s.ending === 'seal' || s.world.endlessRows > 0,
  sing: (s) => s.ngPlus > 0,
  endless: (s) => s.world.endlessRows >= ACH.endlessRows,
};

export const achKey = (id: AchievementId): string => `ach:${id}`;

export function hasAchievement(s: GameState, id: AchievementId): boolean {
  return s.story.ever.includes(achKey(id));
}

export function achievementsEarned(s: GameState): AchievementId[] {
  return ACHIEVEMENT_IDS.filter((id) => hasAchievement(s, id));
}

/** Record any achievement newly earned. Returns the new ones. */
export function stepAchievements(g: Game): AchievementId[] {
  const s = g.state;
  const fresh: AchievementId[] = [];
  for (const id of ACHIEVEMENT_IDS)
    if (!hasAchievement(s, id) && EARNED[id](s)) {
      s.story.ever.push(achKey(id));
      fresh.push(id);
    }
  return fresh;
}
