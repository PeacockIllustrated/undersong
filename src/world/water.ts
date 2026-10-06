// Falling-sand water: each open tile holds 0–8 units; water falls, then spreads sideways to level out.
// Pure and deterministic: tiles settle in the order they were woken. dev-bible §1.4
import { M } from '../data/materials';
import { WATER } from '../data/water';
import type { World } from './world';

/** Change one tile's water level. The caller records it for the save and wakes the tile and its neighbours. */
export type SetWater = (i: number, v: number) => void;

/** One settling pass over the woken tiles. Tiles that move water are woken again through `set`. */
export function settle(w: World, woken: Iterable<number>, flip: boolean, set: SetWater): void {
  const open = (j: number): boolean => j >= 0 && j < w.mat.length && w.mat[j] === M.AIR;
  for (const i of woken) {
    let v = w.water[i]!;
    if (!v) continue;
    if (w.mat[i] !== M.AIR) {
      set(i, 0);
      continue;
    }
    // fall
    const b = i + w.w;
    if (open(b) && w.water[b]! < WATER.full) {
      const mv = Math.min(v, WATER.full - w.water[b]!);
      set(b, w.water[b]! + mv);
      v -= mv;
      set(i, v);
      if (!v) continue;
    }
    // spread sideways, alternating which side goes first so pools stay level
    const x = i % w.w;
    for (const dx of flip ? [1, -1] : [-1, 1]) {
      if (x + dx < 0 || x + dx >= w.w) continue;
      const j = i + dx;
      if (!open(j)) continue;
      const wj = w.water[j]!;
      // a single unit doesn't creep sideways, so pools come to rest instead of jittering
      if (v - wj < 2) continue;
      const mv = (v - wj) >> 1;
      set(j, wj + mv);
      v -= mv;
      set(i, v);
    }
  }
}

/** Every tile holding water, for waking the whole sea after a load. */
export function wetTiles(w: World): number[] {
  const out: number[] = [];
  for (let i = 0; i < w.water.length; i++) if (w.water[i]) out.push(i);
  return out;
}
