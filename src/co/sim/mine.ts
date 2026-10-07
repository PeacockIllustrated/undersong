// The day's mine: Undersong's mountain from a fresh seed each morning, with the Company's coal seams laid in,
// the shaft sunk to the village's depth with a ladder down it. The stone forgets every night (ADR-H002).
import { SHAFT_X, SKY_ROWS } from '../../data/constants';
import { M } from '../../data/materials';
import { hash3, makeRng } from '../../sim/rng';
import { BIOMES } from '../../data/biomes';
import { generateWorld } from '../../world/generator';
import { fbm } from '../../world/noise';
import type { World } from '../../world/world';
import { CHEST, SEAMS } from '../data/co';

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
  bandChests(w, seed);
  w.touchAll();
  return w;
}

/** Every biome band holds at least one chest a day (plan H3). One is carved into the band's rock if none is there. */
export function bandChests(w: World, seed: number): void {
  const rng = makeRng(seed ^ 0x5eed);
  for (const band of BIOMES) {
    if (band.d0 < 0) continue;
    const y0 = SKY_ROWS + Math.max(band.d0, CHEST.firstD);
    const y1 = Math.min(w.h - 3, SKY_ROWS + band.d1);
    if (y0 >= y1) continue;
    let has = false;
    for (const k of Object.keys(w.objects)) {
      const y = Math.floor(Number(k) / w.w);
      if (w.objects[k] === 'chest' && y >= y0 && y < y1) has = true;
    }
    if (has) continue;
    let x = rng.int(3, w.w - 4);
    if (Math.abs(x - SHAFT_X) < 2) x = SHAFT_X + 3;
    const y = rng.int(y0, Math.max(y0, y1 - 2));
    w.mat[y * w.w + x] = M.AIR;
    if (w.mat[(y + 1) * w.w + x] === M.AIR) w.mat[(y + 1) * w.w + x] = M.STONE;
    w.objects[String(y * w.w + x)] = 'chest';
  }
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
