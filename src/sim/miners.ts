// Hired miners: they work the face nearest the shaft, preferring ore, and slow down in the dark. canon §4.4, §4.5
import { lightFactor } from '../data/light';
import { MATERIALS, canDig, isMineable } from '../data/materials';
import { PICKS } from '../data/items';
import { PESTS } from '../data/economy';
import { SHAFT_X } from '../data/constants';
import { NEIGH4 } from '../world/world';
import { hardnessAt } from './formulas';
import type { Game } from './game';
import { reach } from './reach';
import type { Miner, Tile } from './state';
import { makeRng } from './rng';
import { say } from './story';
import { mineTile } from './dig';
import { deepMult, minerMult, pestMult } from './power';

function taken(g: Game, x: number, y: number, self: Miner): boolean {
  const f = g.state.foreman;
  if (f.target && f.target.x === x && f.target.y === y) return true;
  if (f.queue.some((t) => t.x === x && t.y === y)) return true;
  return g.state.miners.some((m) => m !== self && m.target && m.target.x === x && m.target.y === y);
}

/** Find a face for a miner: exposed ore anywhere in the mine first (nearest the shaft), else deepen the shaft. */
export function chooseFace(g: Game, m: Miner): Tile | null {
  const w = g.world;
  const r = reach(g);
  let best: Tile | null = null;
  let bestScore = Infinity;
  const floorY = shaftFloor(g);
  // only rows the village can touch: nothing below the deepest reachable row + 1
  const yEnd = Math.min(w.h, g.reachMaxY + 2);
  for (let y = Math.max(0, w.surf[0]! - 4); y < yEnd; y++) {
    for (let x = 1; x < w.w - 1; x++) {
      const i = y * w.w + x;
      const mat = w.mat[i]!;
      if (!canDig(mat, g.state.pickTier) || y <= w.surf[x]!) continue;
      if (!(r[i - 1] || r[i + 1] || r[i - w.w] || r[i + w.w])) continue;
      if (taken(g, x, y, m)) continue;
      const def = MATERIALS[mat]!;
      // ore wins by a lot; otherwise the shaft floor; otherwise skip plain rock
      const dist = Math.abs(x - SHAFT_X) + Math.abs(y - floorY) * 0.5;
      let score: number;
      if (def.isOre || def.drop?.res === 'spores') score = dist;
      else if (x === SHAFT_X && y === floorY) score = 1000;
      else if (y > w.surf[x]! + 2 && oreNear(g, x, y, g.state.pickTier)) score = 500 + dist;
      else continue;
      if (score < bestScore) {
        bestScore = score;
        best = { x, y };
      }
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
  const power = PICKS[s.pickTier]?.power ?? 1;
  return power * lightFactor(g.world.faceLight(t.x, t.y)) * minerMult(s) * deepMult(s, g.world.depth(t.y));
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
      if (dt < 0.5 && (Math.floor(s.t / 100) + m.id) % 5 !== 0) continue;
      m.target = chooseFace(g, m);
      m.work = 0;
      if (!m.target) continue;
      standBeside(g, m, m.target);
    }
    const t = m.target;
    const light = g.world.faceLight(t.x, t.y);
    m.work += dt * minerRate(g, m);
    if (m.work >= hardnessAt(g.world.hardnessOf(t.x, t.y), g.world.depth(t.y))) {
      mineTile(g, t.x, t.y, 'miner');
      m.target = null;
      m.work = 0;
    }
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
  }
  s.rng = rng.state();
}
