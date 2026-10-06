// Which air tiles the village can walk to: the open sky and everything dug out from it.
import { SHAFT_X } from '../data/constants';
import { M } from '../data/materials';
import { WATER } from '../data/water';
import type { Game } from './game';

export function reach(g: Game): Uint8Array {
  if (!g.reachDirty) return g.reach;
  g.reachDirty = false;
  g.faces = null;
  const w = g.world;
  const r = g.reach.length === w.w * w.h ? g.reach : (g.reach = new Uint8Array(w.w * w.h));
  r.fill(0);
  g.reachMaxY = 0;
  const front = new Uint8Array(w.w * w.h);
  const faces: number[] = [];
  const q = new Int32Array(w.w * w.h);
  let h = 0;
  let t = 0;
  const start = SHAFT_X; // top row: always open sky
  if (w.mat[start] !== M.AIR) {
    g.frontier = [];
    return r;
  }
  r[start] = 1;
  q[t++] = start;
  while (h < t) {
    const i = q[h++]!;
    const x = i % w.w;
    const y = (i - x) / w.w;
    const tryN = (nx: number, ny: number): void => {
      if (nx < 0 || nx >= w.w || ny < 0 || ny >= w.h) return;
      const j = ny * w.w + nx;
      if (w.mat[j] !== M.AIR && !front[j]) {
        front[j] = 1;
        faces.push(j);
      }
      // nobody walks through flooded tiles (canon §12)
      if (r[j] || w.mat[j] !== M.AIR || w.water[j]! >= WATER.deep) return;
      r[j] = 1;
      q[t++] = j;
      if (ny > g.reachMaxY) g.reachMaxY = ny;
    };
    tryN(x + 1, y);
    tryN(x - 1, y);
    tryN(x, y + 1);
    tryN(x, y - 1);
  }
  // the faces, in the same row-by-row order a full scan of the grid would find them
  g.frontier = faces.sort((a, b) => a - b);
  return r;
}

export function reachable(g: Game, x: number, y: number): boolean {
  if (!g.world.inside(x, y)) return false;
  return reach(g)[y * g.world.w + x] === 1;
}

/** A solid tile with a reachable air neighbour. */
export function workable(g: Game, x: number, y: number): boolean {
  return reachable(g, x + 1, y) || reachable(g, x - 1, y) || reachable(g, x, y + 1) || reachable(g, x, y - 1);
}
