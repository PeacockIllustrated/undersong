// Story triggers: village lines, verses and milestones. Pure; the UI shows what lands in state.story.events.
import { CAVE_IN } from '../data/economy';
import { LINES } from '../story/lines';
import type { Game } from './game';
import { canCaveIn } from './cavein';

export function say(g: Game, id: string): void {
  const st = g.state.story;
  if (!LINES[id] || st.seen.includes(id)) return;
  st.seen.push(id);
  if (!st.ever.includes(id)) st.ever.push(id);
  st.events.push({ kind: 'line', id });
}

/** Record the run time a milestone first happened. */
export function first(g: Game, key: string): void {
  const f = g.state.stats.firsts;
  if (f[key] === undefined) f[key] = g.state.t;
}

export function stepStory(g: Game): void {
  const s = g.state;
  if (s.t >= 1500) say(g, s.cycle > 1 || s.stats.caveIns > 0 ? 'introAgain' : 'intro');
  if (s.res.copperOre.gt(0) || s.underground.copperOre.gt(0)) {
    first(g, 'ore');
    say(g, 'firstOre');
  }
  if (s.res.copperBar.gt(0) || s.res.tinBar.gt(0)) {
    first(g, 'bar');
    say(g, 'firstBar');
  }
  if (s.miners.length > 0) {
    first(g, 'miner');
    say(g, 'firstMiner');
  }
  if (s.stats.maxDepthD >= 38) {
    first(g, 'ft150');
    say(g, 'depth150');
  }
  if (s.stats.maxDepthD * 4 >= CAVE_IN.minFt) first(g, 'ft300');
  if (canCaveIn(s)) {
    first(g, 'caveInReady');
    say(g, 'caveInReady');
  }
}
