// The day's mine: Undersong's mountain from a fresh seed each morning, with the Company's coal seams laid in,
// the shaft sunk to the village's depth with a ladder down it. The stone forgets every night (ADR-H002).
import { SHAFT_X, SKY_ROWS } from '../../data/constants';
import { M } from '../../data/materials';
import { hash3 } from '../../sim/rng';
import { generateWorld } from '../../world/generator';
import { fbm } from '../../world/noise';
import type { World } from '../../world/world';
import { SEAMS } from '../data/co';

/** The seed of a given day of a contract. */
export const daySeed = (contractSeed: number, day: number): number =>
  Math.floor(hash3(contractSeed, day, 0x0c0a1) * 0x7fffffff) >>> 0;

export function makeMine(seed: number, shaftDepth: number): World {
  const w = generateWorld(seed);
  const S = seed;
  for (let y = SKY_ROWS + SEAMS.fromD; y < w.h; y++)
    for (let x = 1; x < w.w - 1; x++) {
      const i = y * w.w + x;
      if (!SEAMS.hosts.includes(w.mat[i]!)) continue;
      if (y < w.surf[x]! + SEAMS.fromD) continue;
      // two layers of noise: long seams, and a little wobble so they pinch and swell
      const n = fbm(x * SEAMS.sx, y * SEAMS.sy, S + 911) * 0.8 + fbm(x * 0.3, y * 0.3, S + 913) * 0.2;
      if (n > SEAMS.threshold) w.mat[i] = M.COAL;
    }
  sinkShaft(w, shaftDepth);
  w.touchAll();
  return w;
}

/** The shaft below the headframe: open, with a ladder all the way down and solid walls beside it near the top. */
export function sinkShaft(w: World, depth: number): void {
  const top = w.surf[SHAFT_X] ?? SKY_ROWS;
  for (let d = 0; d <= depth; d++) {
    const y = top + d;
    if (!w.inside(SHAFT_X, y)) break;
    const i = y * w.w + SHAFT_X;
    w.mat[i] = M.AIR;
    w.water[i] = 0;
    w.objects[String(i)] = 'rope';
  }
  // a floor under the shaft foot to stand on
  const foot = (top + depth + 1) * w.w + SHAFT_X;
  if (w.mat[foot] === M.AIR) w.mat[foot] = M.STONE;
}

/** Where the shaft foot is (the tile the Foreman stands in at the bottom). */
export const shaftFoot = (w: World, depth: number): { x: number; y: number } => ({
  x: SHAFT_X,
  y: (w.surf[SHAFT_X] ?? SKY_ROWS) + depth,
});
