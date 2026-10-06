// Act III water: settling, pumps and the drowned town draining. canon §12
import { M } from '../data/materials';
import { PUMP, WATER } from '../data/water';
import { SKY_ROWS } from '../data/constants';
import { settle } from '../world/water';
import { TOWN_HOUSES_X, TOWN_STREET_D } from '../world/generator';
import type { Game } from './game';
import { charm } from './power';
import { first, say } from './story';
import { reachable } from './reach';
import { readVerse } from './dig';

/** Verse VI (0-based 5) is in the first house. */
const TOWN_VERSE0 = 5;

/** Wake a tile and its four neighbours so their water is looked at next pass. */
export function wakeWater(g: Game, i: number): void {
  const w = g.world;
  const x = i % w.w;
  g.wet.add(i);
  if (i >= w.w) g.wet.add(i - w.w);
  if (i + w.w < w.mat.length) g.wet.add(i + w.w);
  if (x > 0) g.wet.add(i - 1);
  if (x < w.w - 1) g.wet.add(i + 1);
}

/** The one way water levels change: recorded for the save, redrawn, and reach rebuilt when a tile floods or clears. */
export function setWater(g: Game, i: number, v: number): void {
  const w = g.world;
  const old = w.water[i]!;
  if (old === v) return;
  w.water[i] = v;
  g.state.world.water[String(i)] = v;
  wakeWater(g, i);
  const x = i % w.w;
  const y = (i - x) / w.w;
  if (old >= WATER.deep !== v >= WATER.deep) {
    g.reachDirty = true;
    w.touch(x, y);
  } else w.redraw(x, y);
}

export const flooded = (g: Game, x: number, y: number): boolean =>
  g.world.inside(x, y) && g.world.water[y * g.world.w + x]! >= WATER.deep;

/** Flooded water on any side of a tile: a face a miner works from the water's edge. */
export function besideWater(g: Game, x: number, y: number): { x: number; y: number } | null {
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const)
    if (flooded(g, x + dx, y + dy)) return { x: x + dx, y: y + dy };
  return null;
}

export function pumpRate(g: Game): number {
  return PUMP.perSec * charm(g.state, 'window');
}

export function stepWater(g: Game, dt: number): void {
  const passes = Math.min(WATER.maxPassesPerStep, Math.max(1, Math.round(dt * 10)) * WATER.passesPerTick);
  for (let p = 0; p < passes && g.wet.size; p++) {
    const cur = g.wet;
    g.wet = new Set();
    settle(g.world, cur, (Math.floor(g.state.t / 100) + p) % 2 === 1, (i, v) => setWater(g, i, v));
  }
  stepPumps(g, dt);
  stepTown(g);
}

/** canon §12: every pump drains its radius, topmost water first, so the level falls as you watch. */
function stepPumps(g: Game, dt: number): void {
  const s = g.state;
  const pumps = Object.entries(s.world.objects).filter(([, o]) => o === 'pump');
  if (!pumps.length) {
    s.pumpAcc = 0;
    return;
  }
  s.pumpAcc += pumpRate(g) * dt;
  const units = Math.floor(s.pumpAcc);
  s.pumpAcc -= units;
  if (!units) return;
  const w = g.world;
  const r = PUMP.radius;
  for (const [key] of pumps) {
    const pi = Number(key);
    const px = pi % w.w;
    const py = (pi - px) / w.w;
    let left = units;
    for (let y = Math.max(0, py - r); y <= Math.min(w.h - 1, py + r) && left > 0; y++)
      for (let x = Math.max(0, px - r); x <= Math.min(w.w - 1, px + r) && left > 0; x++) {
        if ((x - px) ** 2 + (y - py) ** 2 > r * r) continue;
        const i = y * w.w + x;
        const v = w.water[i]!;
        if (!v) continue;
        const take = Math.min(v, left);
        setWater(g, i, v - take);
        left -= take;
      }
    if (left < units) first(g, 'pumped');
  }
}

/** Verses VI–VIII are carved on the back walls of the first three houses: read once the house is dry and someone can walk in. */
function readHouseVerse(g: Game, h: number): void {
  const c = g.world.carvings.find((k) => k.verse === TOWN_VERSE0 + h);
  if (!c || g.state.verses.run[c.verse]) return;
  if (reachable(g, c.x + 1, c.y)) readVerse(g, c);
}

/** The inside of drowned house h: [x0, y0, x1, y1] inclusive. */
export function houseRect(h: number): [number, number, number, number] {
  const hx = TOWN_HOUSES_X[h]!;
  const street = SKY_ROWS + TOWN_STREET_D;
  return [hx - 3, street - 6, hx + 3, street - 1];
}

/** canon §12: a drowned house is drained once nothing inside it is flooded. Each one tells a little more. */
function stepTown(g: Game): void {
  const s = g.state;
  if (s.t % 1000 !== 0 || s.stats.maxDepthD < TOWN_STREET_D - 12) return;
  for (let h = 0; h < TOWN_HOUSES_X.length; h++) {
    const flag = `house${h}`;
    if (s.stats.firsts[flag] !== undefined) {
      readHouseVerse(g, h);
      continue;
    }
    const [x0, y0, x1, y1] = houseRect(h);
    let dry = true;
    for (let y = y0; y <= y1 && dry; y++)
      for (let x = x0; x <= x1; x++)
        if (g.world.get(x, y) === M.AIR && flooded(g, x, y)) {
          dry = false;
          break;
        }
    if (!dry) continue;
    first(g, flag);
    say(g, flag);
  }
}
