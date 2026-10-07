// Hired miners: they work the face nearest the shaft, preferring ore, and slow down in the dark. canon §4.4, §4.5
import { lightFactor } from '../data/light';
import { MATERIALS, canDig, isMineable } from '../data/materials';
import { PESTS } from '../data/economy';
import { EELS } from '../data/water';
import { besideWater } from './water';
import { COARSE_STEP_S, SHAFT_X } from '../data/constants';
import { NEIGH4 } from '../world/world';
import { hardnessAt } from './formulas';
import type { Game } from './game';
import { reach } from './reach';
import type { Miner, Tile } from './state';
import { makeRng } from './rng';
import { say } from './story';
import { mineTile } from './dig';
import { deepMult, minerMult, pestMult, pickPower } from './power';
import { heatAt, heatFactor } from './heat';
import { brothCool } from './surface';
import { HEAT, WISPS } from '../data/heat';

function taken(g: Game, x: number, y: number, self: Miner): boolean {
  const f = g.state.foreman;
  if (f.target && f.target.x === x && f.target.y === y) return true;
  if (f.queue.some((t) => t.x === x && t.y === y)) return true;
  return g.state.miners.some((m) => m !== self && m.target && m.target.x === x && m.target.y === y);
}

/** Every tile the Foreman or another miner has already claimed, as tile indices. */
function claimed(g: Game, self: Miner): Set<number> {
  const w = g.world.w;
  const f = g.state.foreman;
  const out = new Set<number>();
  if (f.target) out.add(f.target.y * w + f.target.x);
  for (const t of f.queue) out.add(t.y * w + t.x);
  for (const m of g.state.miners) if (m !== self && m.target) out.add(m.target.y * w + m.target.x);
  return out;
}

/** Faces worth a miner's time for this pick: ore and spores, the shaft column, and rock with ore behind it. */
function faces(g: Game): number[] {
  reach(g); // also rebuilds the frontier and clears this cache
  const tier = g.state.pickTier;
  if (g.faces?.tier === tier) return g.faces.list;
  const w = g.world;
  const y0 = Math.max(0, w.surf[0]! - 4);
  const list: number[] = [];
  for (const i of g.frontier) {
    const x = i % w.w;
    const y = (i - x) / w.w;
    if (y < y0 || x < 1 || x >= w.w - 1) continue;
    const mat = w.mat[i]!;
    if (!canDig(mat, tier) || y <= w.surf[x]!) continue;
    const def = MATERIALS[mat]!;
    if (
      def.isOre ||
      def.drop?.res === 'spores' ||
      x === SHAFT_X ||
      (y > w.surf[x]! + 2 && oreNear(g, x, y, tier))
    )
      list.push(i);
  }
  g.faces = { tier, list };
  return list;
}

/** Find a face for a miner: exposed ore anywhere in the mine first (nearest the shaft), else deepen the shaft. */
export function chooseFace(g: Game, m: Miner): Tile | null {
  const w = g.world;
  const list = faces(g);
  let best: Tile | null = null;
  let bestScore = Infinity;
  const floorY = shaftFloor(g);
  const busy = claimed(g, m);
  // in row order, so ties break as a scan of the whole grid would
  for (const i of list) {
    if (busy.has(i)) continue;
    const x = i % w.w;
    const y = (i - x) / w.w;
    const def = MATERIALS[w.mat[i]!]!;
    // ore wins by a lot; otherwise the shaft floor; otherwise skip plain rock
    const dist = Math.abs(x - SHAFT_X) + Math.abs(y - floorY) * 0.5;
    let score: number;
    if (def.isOre || def.drop?.res === 'spores') score = dist;
    else if (x === SHAFT_X && y === floorY) score = 1000;
    else if (y > w.surf[x]! + 2 && oreNear(g, x, y, g.state.pickTier)) score = 500 + dist;
    else continue;
    // canon §15: nobody works a face that is too hot; a vent or water cools it
    if (score < bestScore && heatAt(g, x, y) - brothCool(g.state) >= HEAT.stopAt) {
      say(g, 'tooHot');
      continue;
    }
    if (score < bestScore) {
      bestScore = score;
      best = { x, y };
    }
  }
  return best;
}

/** Hidden ore within two tiles that the village's pick can break: miners tunnel toward it. */
function oreNear(g: Game, x: number, y: number, pickTier: number): boolean {
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      const m = g.world.get(x + dx, y + dy);
      if (MATERIALS[m]?.isOre && canDig(m, pickTier)) return true;
    }
  return false;
}

export function shaftFloor(g: Game): number {
  const w = g.world;
  let y = w.surf[SHAFT_X]!;
  while (y < w.h - 1 && w.isAir(SHAFT_X, y + 1)) y++;
  return y + 1;
}

function standBeside(g: Game, m: Miner, t: Tile): void {
  const r = reach(g);
  for (const [dx, dy] of NEIGH4) {
    const x = t.x + dx;
    const y = t.y + dy;
    if (g.world.inside(x, y) && r[y * g.world.w + x]) {
      m.x = x;
      m.y = y;
      return;
    }
  }
}

export function minerRate(g: Game, m: Miner): number {
  const t = m.target;
  if (!t) return 0;
  const s = g.state;
  const power = pickPower(s);
  return (
    power *
    lightFactor(g.world.faceLight(t.x, t.y)) *
    minerMult(s) *
    deepMult(s, g.world.depth(t.y)) *
    heatFactor(heatAt(g, t.x, t.y) - brothCool(s))
  );
}

/** M8-05: ore a second the miners send up from the faces they are working now (for the Village sheet). */
export function minerOreRate(g: Game): number {
  let sum = 0;
  for (const m of g.state.miners) {
    const t = m.target;
    if (!t || m.stalledBy !== null) continue;
    const drop = MATERIALS[g.world.get(t.x, t.y)]?.drop;
    if (!drop || drop.res === 'rubble') continue;
    const need = hardnessAt(g.world.hardnessOf(t.x, t.y), g.world.depth(t.y));
    sum += (minerRate(g, m) / need) * drop.n;
  }
  return sum;
}

/**
 * Put dt seconds of work into the miner's face. A long catch-up step (offline) keeps going onto the next face with
 * the time left over, so coarse steps dig as much as real time would.
 */
function work(g: Game, m: Miner, dt: number): void {
  let left = dt;
  for (let t = m.target; t;) {
    const rate = minerRate(g, m);
    const need = hardnessAt(g.world.hardnessOf(t.x, t.y), g.world.depth(t.y));
    if (dt < COARSE_STEP_S || rate <= 0 || m.work + rate * left < need) {
      m.work += rate * left;
      if (m.work >= need) {
        mineTile(g, t.x, t.y, 'miner');
        m.target = null;
        m.work = 0;
      }
      return;
    }
    left -= (need - m.work) / rate;
    mineTile(g, t.x, t.y, 'miner');
    m.work = 0;
    m.target = t = chooseFace(g, m);
    if (t) standBeside(g, m, t);
  }
}

export function stepMiners(g: Game, dt: number): void {
  const s = g.state;
  const rng = makeRng(s.rng);
  for (const m of s.miners) {
    if (m.stalledBy !== null) {
      if (!s.pests.some((p) => p.id === m.stalledBy)) m.stalledBy = null;
      else continue;
    }
    if (m.target && (!isMineable(g.world.get(m.target.x, m.target.y)) || taken(g, m.target.x, m.target.y, m)))
      m.target = null;
    if (!m.target) {
      // re-plan at most a few times a second per miner, staggered by id
      if (dt < COARSE_STEP_S && (Math.floor(s.t / 100) + m.id) % 5 !== 0) continue;
      m.target = chooseFace(g, m);
      m.work = 0;
      if (!m.target) continue;
      standBeside(g, m, m.target);
    }
    const t = m.target;
    const light = g.world.faceLight(t.x, t.y);
    work(g, m, dt);
    // Burrow beetles nest in the dark (ADR-008)
    if (light < PESTS.darkBelow) {
      say(g, 'darkMiners');
      if (!g.offline && rng.next() < PESTS.beetleChancePerSec * pestMult(s) * dt) {
        const id = s.nextId++;
        s.pests.push({ id, kind: 'beetle', x: m.x, y: m.y, born: s.t, minerId: m.id });
        m.stalledBy = id;
        g.events.push({ kind: 'pest', x: m.x, y: m.y, cleared: false });
        say(g, 'beetle');
      }
    }
    // Cinder wisps gather at hot faces (canon §15)
    if (m.stalledBy === null && !g.offline && heatAt(g, t.x, t.y) >= WISPS.minHeat)
      if (rng.next() < WISPS.chancePerSec * pestMult(s) * dt) {
        const id = s.nextId++;
        s.pests.push({ id, kind: 'wisp', x: t.x, y: t.y - 1, born: s.t, minerId: m.id });
        m.stalledBy = id;
        g.events.push({ kind: 'pest', x: t.x, y: t.y, cleared: false });
        say(g, 'wisp');
      }
    // Cave eels bite at miners working from the water's edge (canon §12)
    const wet = m.stalledBy === null ? (besideWater(g, t.x, t.y) ?? besideWater(g, m.x, m.y)) : null;
    if (wet && !g.offline && rng.next() < EELS.chancePerSec * dt) {
      const id = s.nextId++;
      s.pests.push({ id, kind: 'eel', x: wet.x, y: wet.y, born: s.t, minerId: m.id });
      m.stalledBy = id;
      g.events.push({ kind: 'pest', x: wet.x, y: wet.y, cleared: false });
      say(g, 'eel');
    }
  }
  s.rng = rng.state();
}
