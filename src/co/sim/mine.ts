// The day's mine: Undersong's mountain from a fresh seed each morning, with the Company's coal seams laid in,
// the shaft sunk to the village's depth with a ladder down it. The stone forgets every night (ADR-H002).
import { SHAFT_X, SKY_ROWS } from '../../data/constants';
import { M } from '../../data/materials';
import { hash3, makeRng } from '../../sim/rng';
import { BIOMES } from '../../data/biomes';
import { generateWorld } from '../../world/generator';
import { fbm } from '../../world/noise';
import type { World } from '../../world/world';
import { CHEST, SEAMS, SEAM_FX, type SeamId } from '../data/co';

/** The seed of a given day of a contract. */
export const daySeed = (contractSeed: number, day: number): number =>
  Math.floor(hash3(contractSeed, day, 0x0c0a1) * 0x7fffffff) >>> 0;

export function makeMine(seed: number, shaftDepth: number, seam: SeamId = 'openCut'): World {
  const w = generateWorld(seed);
  const S = seed;
  const threshold = SEAMS.threshold + (seam === 'workings' ? SEAM_FX.workings.coalShift : 0);
  for (let y = SKY_ROWS + SEAMS.fromD; y < w.h; y++)
    for (let x = 1; x < w.w - 1; x++) {
      const i = y * w.w + x;
      if (!SEAMS.hosts.includes(w.mat[i]!)) continue;
      if (y < w.surf[x]! + SEAMS.fromD) continue;
      // two layers of noise: long seams, and a little wobble so they pinch and swell
      const n = fbm(x * SEAMS.sx, y * SEAMS.sy, S + 911) * 0.8 + fbm(x * 0.3, y * 0.3, S + 913) * 0.2;
      if (n > threshold) w.mat[i] = M.COAL;
    }
  if (seam === 'drowned') funnel(w);
  if (seam === 'geode') bowl(w, seed);
  if (seam === 'workings') workings(w, seed);
  if (seam === 'chimney') chimney(w, seed);
  sinkShaft(w, Math.min(shaftDepth, w.h - SKY_ROWS - 8));
  bandChests(w, seed);
  w.touchAll();
  return w;
}

/** The Drowned Street: a funnel of open ground around the shaft, narrowing as it goes down. */
function funnel(w: World): void {
  const f = SEAM_FX.drowned;
  for (let d = 1; d < f.depth; d++) {
    const half = Math.round((f.topW + (f.footW - f.topW) * (d / f.depth)) / 2);
    for (let x = SHAFT_X - half; x <= SHAFT_X + half; x++) {
      const y = (w.surf[x] ?? SKY_ROWS) + d;
      if (!w.inside(x, y) || x === SHAFT_X) continue;
      // terraced: a ledge every fourth row, so the funnel can be climbed out of
      if (d % 4 === 0 && Math.abs(x - SHAFT_X) > half - 2) continue;
      w.mat[y * w.w + x] = M.AIR;
      w.water[y * w.w + x] = 0;
    }
  }
}

/** The Hanging Geode: a great bowl under the shaft with crystal and coal hanging from its roof. */
function bowl(w: World, seed: number): void {
  const f = SEAM_FX.geode;
  const top = (w.surf[SHAFT_X] ?? SKY_ROWS) + f.top;
  const bot = (w.surf[SHAFT_X] ?? SKY_ROWS) + f.bottom;
  const cy = (top + bot) / 2;
  const ry = (bot - top) / 2;
  for (let y = top - 4; y <= bot; y++)
    for (let x = 1; x < w.w - 1; x++) {
      const e = ((x - SHAFT_X) / f.halfW) ** 2 + ((y - cy) / ry) ** 2;
      const i = y * w.w + x;
      if (e < 1) {
        // the roof hangs: stalactites of crystal, aquamarine and coal from the top of the bowl
        const hang =
          y < cy &&
          hash3(x, 0, seed + 41) * 8 >
            y - (cy - ry * Math.sqrt(Math.max(0, 1 - ((x - SHAFT_X) / f.halfW) ** 2)));
        if (hang) {
          const r = hash3(x, y, seed + 43);
          w.mat[i] = r < f.crystal ? M.CRYSTAL : r < f.crystal + 0.2 ? M.AQUA : M.COAL;
        } else w.mat[i] = M.AIR;
        w.water[i] = 0;
      } else if (e < 1.25 && y > cy) w.mat[i] = M.STONE;
    }
}

/** The Old Workings: tunnels from past villages wander everywhere, with chests left in them. */
function workings(w: World, seed: number): void {
  const f = SEAM_FX.workings;
  const rng = makeRng(seed ^ 0x01d);
  for (let t = 0; t < f.tunnels; t++) {
    let x = rng.int(3, w.w - 4);
    let y = SKY_ROWS + rng.int(6, 160);
    let dx = rng.next() < 0.5 ? -1 : 1;
    for (let k = 0; k < f.length; k++) {
      for (const yy of [y - 1, y]) {
        if (!w.inside(x, yy) || w.mat[yy * w.w + x] === M.BEDROCK || w.mat[yy * w.w + x] === M.CARVING)
          continue;
        w.mat[yy * w.w + x] = M.AIR;
      }
      if (
        k % 15 === 7 &&
        w.inside(x, y + 1) &&
        w.mat[(y + 1) * w.w + x] !== M.AIR &&
        rng.next() < f.chests / 4
      )
        w.objects[String(y * w.w + x)] = 'chest';
      const r = rng.next();
      if (r < 0.12) y += 1;
      else if (r < 0.2) y -= 1;
      else if (r < 0.25) dx = -dx;
      x += dx;
      if (x < 2 || x > w.w - 3) dx = -dx;
      x = Math.max(2, Math.min(w.w - 3, x));
    }
  }
}

/** The Ember Chimney: the deep comes up to 120 ft, all basalt and ember. */
function chimney(w: World, seed: number): void {
  const f = SEAM_FX.chimney;
  for (let y = SKY_ROWS + f.heatD; y < w.h; y++)
    for (let x = 1; x < w.w - 1; x++) {
      const i = y * w.w + x;
      const m = w.mat[i]!;
      if (m === M.STONE || m === M.SLATE || m === M.SINGING || m === M.DIRT)
        w.mat[i] = hash3(x, y, seed + 51) < f.emberChance ? M.EMBER : M.BASALT;
      w.water[i] = 0;
    }
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
