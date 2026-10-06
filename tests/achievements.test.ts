import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/game';
import { apply } from '../src/sim/actions';
import { step } from '../src/sim/step';
import { achievementsEarned, hasAchievement, stepAchievements } from '../src/sim/achievements';
import { fromJSON, toJSON } from '../src/save/codec';
import { loadGame } from '../src/sim/game';
import { BIOMES } from '../src/data/biomes';

describe('achievements', () => {
  it('are earned once, from what the village has done', () => {
    const g = createGame(3);
    expect(stepAchievements(g)).toEqual([]);
    g.state.verses.known[1] = true;
    g.state.stats.maxDepthD = BIOMES[2]!.d0;
    expect(stepAchievements(g).sort()).toEqual(['biome2', 'verse1']);
    expect(stepAchievements(g)).toEqual([]);
    expect(achievementsEarned(g.state)).toContain('verse1');
  });

  it('are checked as the game runs, survive a Cave-in, and reload the same', () => {
    const g = createGame(3);
    g.state.stats.maxDepthD = 80;
    g.state.verses.run[1] = true;
    g.state.verses.known[1] = true;
    apply(g, { type: 'caveIn' });
    step(g, 1000);
    expect(hasAchievement(g.state, 'caveIn1')).toBe(true);
    expect(hasAchievement(g.state, 'verse1')).toBe(true);
    const again = loadGame(fromJSON(toJSON(g.state)));
    expect(achievementsEarned(again.state)).toEqual(achievementsEarned(g.state));
  });
});
