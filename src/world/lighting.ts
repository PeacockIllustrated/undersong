// Two-channel per-tile light by flood fill. canon §7, dev-bible §1.4
import { LIGHT } from '../data/light';
import { M, MATERIALS } from '../data/materials';
import type { World } from './world';

/** Light a source tile gives off in each channel. */
export function sourceAt(w: World, x: number, y: number): [number, number] {
  const i = y * w.w + x;
  const m = w.mat[i]!;
  let warm = 0;
  let cool = 0;
  if (m === M.AIR) {
    if (y < w.surf[x]!) warm = LIGHT.sky;
    const o = w.objects[String(i)];
    if (o === 'torch') {
      const deep = w.depth(y) >= LIGHT.torchDeepFromD && !w.torchSteady;
      warm = Math.max(warm, (deep ? LIGHT.torchDeep : LIGHT.torch) * w.torchMult);
    } else if (o === 'lantern' && w.lanternsLit && !w.dimmed.has(i)) warm = Math.max(warm, LIGHT.lantern);
  } else {
    const e = MATERIALS[m]?.emit;
    if (e) {
      if (e.channel === 'warm') warm = e.strength;
      else cool = e.strength;
    }
  }
  return [warm, cool];
}

function decayInto(w: World, i: number): number {
  if (w.mat[i] !== M.AIR) return LIGHT.decaySolid;
  return w.water[i]! >= 4 ? LIGHT.decayWater : LIGHT.decayAir;
}

/**
 * Recompute light exactly for the inner rect [x0,x1)×[y0,y1). Light cannot travel further than
 * LIGHT.margin tiles, so flooding an outer rect expanded by that margin gives exact inner values.
 */
export function relightRect(w: World, x0: number, y0: number, x1: number, y1: number): void {
  const mg = LIGHT.margin;
  const ox0 = Math.max(0, x0 - mg);
  const oy0 = Math.max(0, y0 - mg);
  const ox1 = Math.min(w.w, x1 + mg);
  const oy1 = Math.min(w.h, y1 + mg);
  const ow = ox1 - ox0;
  const oh = oy1 - oy0;
  const n = ow * oh;
  const warm = new Float32Array(n);
  const cool = new Float32Array(n);
  const queue = new Int32Array(n * 4);

  for (const ch of [0, 1] as const) {
    const val = ch === 0 ? warm : cool;
    let head = 0;
    let tail = 0;
    for (let ly = 0; ly < oh; ly++)
      for (let lx = 0; lx < ow; lx++) {
        const s = sourceAt(w, ox0 + lx, oy0 + ly)[ch];
        if (s > 0) {
          const li = ly * ow + lx;
          val[li] = s;
          queue[tail++ % queue.length] = li;
        }
      }
    while (head !== tail) {
      const li = queue[head++ % queue.length]!;
      const v = val[li]!;
      const lx = li % ow;
      const ly = (li - lx) / ow;
      for (let k = 0; k < 4; k++) {
        const nx = lx + (k === 0 ? 1 : k === 1 ? -1 : 0);
        const ny = ly + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < 0 || ny < 0 || nx >= ow || ny >= oh) continue;
        const ni = ny * ow + nx;
        const nv = v - decayInto(w, (oy0 + ny) * w.w + ox0 + nx);
        if (nv > val[ni]! + 1e-6) {
          val[ni] = nv;
          queue[tail++ % queue.length] = ni;
        }
      }
    }
  }

  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const li = (y - oy0) * ow + (x - ox0);
      const gi = y * w.w + x;
      w.warm[gi] = warm[li]!;
      w.cool[gi] = cool[li]!;
    }
}
