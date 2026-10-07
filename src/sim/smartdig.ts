// M7-02 Smart dig: taps that snap to ore, and a long press that takes a whole vein. Pure; reads the game only.
import { DIG_QUEUE_MAX } from '../data/constants';
import { MATERIALS, canDig, isMineable } from '../data/materials';
import { SMART_DIG } from '../data/touch';
import type { Game } from './game';
import { workable } from './reach';
import type { Tile } from './state';

const isOreAt = (g: Game, x: number, y: number): boolean => !!MATERIALS[g.world.get(x, y)]?.isOre;

/** A tap on plain rock within SMART_DIG.snap tiles of workable ore the pick can break digs that ore instead. */
export function snapToOre(g: Game, x: number, y: number): Tile {
  const m = g.world.get(x, y);
  if (!isMineable(m) || isOreAt(g, x, y)) return { x, y };
  const r = SMART_DIG.snap;
  let best: Tile | null = null;
  let bd = Infinity;
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      const tx = x + dx;
      const ty = y + dy;
      if (!isOreAt(g, tx, ty) || !canDig(g.world.get(tx, ty), g.state.pickTier) || !workable(g, tx, ty)) continue;
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = { x: tx, y: ty };
      }
    }
  return best ?? { x, y };
}

/** Every ore tile of the vein through (x, y) that the pick can break, nearest first (8-way), up to the dig queue. */
export function veinTiles(g: Game, x: number, y: number): Tile[] {
  if (!isOreAt(g, x, y) || !canDig(g.world.get(x, y), g.state.pickTier)) return [];
  const w = g.world;
  const seen = new Set<number>([w.idx(x, y)]);
  const out: Tile[] = [{ x, y }];
  for (let i = 0; i < out.length && out.length < DIG_QUEUE_MAX; i++) {
    const t = out[i]!;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = t.x + dx;
        const ny = t.y + dy;
        if (nx < 0 || ny < 0 || nx >= w.w || ny >= w.h) continue;
        const k = w.idx(nx, ny);
        if (seen.has(k)) continue;
        seen.add(k);
        if (isOreAt(g, nx, ny) && canDig(w.get(nx, ny), g.state.pickTier) && out.length < DIG_QUEUE_MAX)
          out.push({ x: nx, y: ny });
      }
  }
  return out;
}
