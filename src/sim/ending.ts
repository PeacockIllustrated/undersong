// The ending (canon §3, §15): at the Hollow Heart, with Verse XII sung, the Foreman chooses.
// Seal the shaft: the village forgets one last time, and Endless Depth opens under the Heart.
// Sing the last verse: Holloway remembers every cycle at once, and New Song+ begins.
import { ENDLESS } from '../data/heat';
import { BASE_WORLD_H, HEART_FLOOR_D, SKY_ROWS } from '../data/constants';
import { extendWorld } from '../world/generator';
import { caveIn } from './cavein';
import type { Game } from './game';
import type { GameState } from './state';
import { first } from './story';

export type Ending = 'seal' | 'sing';

/** Verse XII has been found this run and the choice has not been made yet. */
export function endingReady(s: GameState): boolean {
  return s.verses.run[11] === true && s.stats.firsts.chose === undefined;
}

export function chooseEnding(g: Game, which: Ending): boolean {
  const s = g.state;
  if (!endingReady(s)) return false;
  first(g, 'chose');
  s.ending = which;
  if (which === 'seal') s.world.endlessRows = Math.max(s.world.endlessRows, ENDLESS.rows);
  else s.ngPlus++;
  // both endings close this cycle; the ending's scene plays before the collapse
  if (!caveIn(g)) return false;
  s.story.events.unshift({ kind: 'ending', which });
  return true;
}

/** Endless Depth: once the shaft is sealed, the mountain keeps going whenever the village nears its floor. */
export function stepEndless(g: Game): void {
  const s = g.state;
  if (s.ending !== 'seal' || s.world.endlessRows === 0) return;
  const floor = HEART_FLOOR_D + s.world.endlessRows;
  if (g.world.depth(g.reachMaxY) < floor - ENDLESS.margin) return;
  const oldH = g.world.h;
  s.world.endlessRows += ENDLESS.rows;
  g.world.grow(BASE_WORLD_H + s.world.endlessRows - oldH);
  extendWorld(
    g.world,
    s.seed,
    { oldShaftD: s.world.oldShaftD, endlessRows: s.world.endlessRows },
    SKY_ROWS + floor,
  );
  g.reach = new Uint8Array(g.world.w * g.world.h);
  g.reachDirty = true;
  g.heat.clear();
}
