// One fixed tick of the simulation. Pure and deterministic: same state + actions → same result. dev-bible §1.3
import { UPGRADE_FX } from '../data/upgrades';
import { FOREMAN_RATE, hardnessAt } from './formulas';
import type { Game } from './game';
import { stepForeman } from './dig';
import { stepMiners } from './miners';
import { stepForge, stepHaul } from './economy';
import { stepStory } from './story';
import { stepWater } from './water';
import { coolCache } from './heat';
import { stepEndless } from './ending';
import { stepHelpers } from './helpers';
import { stepKiln, stepLampworks, stepLanterns } from './village';

export { mineTile } from './dig';

/** Advance the game by dtMs (normally TICK_MS). */
export function step(g: Game, dtMs: number): void {
  const s = g.state;
  const dt = dtMs / 1000;
  s.t += dtMs;
  s.totalT += dtMs;
  stepWater(g, dt);
  // water moves and vents come and go: heat is worked out afresh each second
  if (s.t % 1000 === 0 || dt >= 1) coolCache(g);
  stepForeman(g, dt);
  stepMiners(g, dt);
  stepHaul(g, dt);
  stepForge(g, dt);
  stepKiln(g, dt);
  stepLampworks(g, dt);
  stepLanterns(g, dt);
  stepHelpers(g, dt);
  stepGlints(g);
  stepStory(g);
  if (s.t % 1000 === 0 || dt >= 1) stepEndless(g);
}

/** Pell's Hum: the nearest unfound verse glints when the Foreman is close. */
function stepGlints(g: Game): void {
  const s = g.state;
  s.glints = s.glints.filter((gl) => gl.until > s.t);
  if (!s.upgrades.pellsHum || g.offline || s.t % 1000 !== 0) return;
  let best = null as null | { x: number; y: number; d: number };
  for (const c of g.world.carvings) {
    if (s.verses.run[c.verse]) continue;
    const d = Math.hypot(c.x - s.foreman.x, c.y - s.foreman.y);
    if (d <= UPGRADE_FX.pellsHumRange && (!best || d < best.d)) best = { x: c.x, y: c.y, d };
  }
  if (best) s.glints.push({ x: best.x, y: best.y, until: s.t + 1000, kind: 'hum' });
}

/** 0..1 progress on the foreman's current tile, for the crack overlay. */
export function digProgress(g: Game): number {
  const t = g.state.foreman.target;
  if (!t) return 0;
  const need = hardnessAt(g.world.hardnessOf(t.x, t.y), g.world.depth(t.y));
  return need > 0 ? Math.min(1, g.state.foreman.work / need) : 0;
}

export { FOREMAN_RATE };
