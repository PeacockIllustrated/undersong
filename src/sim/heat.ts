// Heat (canon §15): worked out on demand from the rock around a tile, cached until the mine changes.
import { HEAT } from '../data/heat';
import { KEY_FX } from '../data/beyond';
import { M } from '../data/materials';
import { OBJECTS } from '../data/objects';
import { WATER } from '../data/water';
import type { Game } from './game';

const HOT = new Set<number>([M.EMBER, M.HEART]);

/** Heat at a tile, 0 upward. Pure: the same mine gives the same heat. */
export function heatAt(g: Game, x: number, y: number): number {
  const w = g.world;
  const d = w.depth(y);
  const fromD = HEAT.fromD - (g.state.songKey === 'hot' ? KEY_FX.hot.earlierD : 0);
  if (d < fromD - HEAT.hotR) return 0;
  const i = w.idx(x, y);
  const cached = g.heat.get(i);
  if (cached !== undefined) return cached;
  let h = Math.min(HEAT.ambientMax, Math.max(0, HEAT.ambientPerTile * (d - fromD)));
  const r = HEAT.hotR;
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      if (!HOT.has(w.get(x + dx, y + dy))) continue;
      h += HEAT.hotEach * (1 - Math.max(Math.abs(dx), Math.abs(dy)) / (r + 1));
    }
  if (h > 0) {
    const vr = OBJECTS.vent.radius!;
    let vented = false;
    for (let dy = -vr; dy <= vr && !vented; dy++)
      for (let dx = -vr; dx <= vr; dx++)
        if (dx * dx + dy * dy <= vr * vr && w.objectAt(x + dx, y + dy) === 'vent') {
          vented = true;
          break;
        }
    if (vented) h -= HEAT.ventCool;
    let wet = false;
    for (let dy = -1; dy <= 1 && !wet; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if (w.inside(x + dx, y + dy) && w.water[w.idx(x + dx, y + dy)]! >= WATER.deep) {
          wet = true;
          break;
        }
    if (wet) h -= HEAT.waterCool;
  }
  h = Math.max(0, h);
  g.heat.set(i, h);
  return h;
}

/** How fast a worker goes at a face this hot: 1, slowed, or 0 (too hot). */
export function heatFactor(h: number): number {
  return h >= HEAT.stopAt ? 0 : h >= HEAT.slowAt ? HEAT.slowFactor : 1;
}

/** Forget cached heat: the rock, the water or the vents have changed. */
export function coolCache(g: Game): void {
  if (g.heat.size) g.heat.clear();
}
