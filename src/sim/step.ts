// One fixed tick of the simulation. Pure and deterministic: same state + actions → same result. dev-bible §1.3
import { MATERIALS, isMineable } from '../data/materials';
import { NEIGH4 } from '../world/world';
import { D } from './decimal';
import { FOREMAN_RATE, hardnessAt } from './formulas';
import type { Game } from './game';
import { PICKS } from '../data/items';

/** Advance the game by dtMs (normally TICK_MS). */
export function step(g: Game, dtMs: number): void {
  const s = g.state;
  s.t += dtMs;
  s.totalT += dtMs;
  stepForeman(g, dtMs / 1000);
}

function pickPower(g: Game): number {
  return PICKS[g.state.pickTier]?.power ?? 1;
}

function stepForeman(g: Game, dt: number): void {
  const { world } = g;
  const f = g.state.foreman;
  // Pick the next workable tile from the queue.
  while (!f.target && f.queue.length) {
    const t = f.queue.shift()!;
    if (isMineable(world.get(t.x, t.y)) && world.exposed(t.x, t.y)) {
      f.target = t;
      f.work = 0;
    }
  }
  const t = f.target;
  if (!t) return;
  if (!isMineable(world.get(t.x, t.y))) {
    f.target = null;
    return;
  }
  // Stand in the open tile next to the face, nearest to where the foreman already is.
  let best = Infinity;
  for (const [dx, dy] of NEIGH4) {
    const ax = t.x + dx;
    const ay = t.y + dy;
    if (!world.isAir(ax, ay)) continue;
    const d = Math.abs(ax - f.x) + Math.abs(ay - f.y) + (dy === 0 ? 0 : 0.5);
    if (d < best) {
      best = d;
      f.x = ax;
      f.y = ay;
    }
  }
  f.work += dt * pickPower(g) * FOREMAN_RATE;
  const need = hardnessAt(world.hardnessOf(t.x, t.y), world.depth(t.y));
  if (f.work >= need) mineTile(g, t.x, t.y);
}

/** Remove a tile and pay out its drop to the foreman's pack. */
export function mineTile(g: Game, x: number, y: number): void {
  const { world, state } = g;
  const m = world.get(x, y);
  const def = MATERIALS[m];
  world.set(x, y, 0);
  state.stats.tilesMined++;
  state.stats.maxDepthD = Math.max(state.stats.maxDepthD, world.depth(y));
  state.stats.bestDepthD = Math.max(state.stats.bestDepthD, state.stats.maxDepthD);
  if (def?.drop) {
    state.res[def.drop.res] = state.res[def.drop.res].add(D(def.drop.n));
    g.events.push({ kind: 'drop', x, y, res: def.drop.res, n: def.drop.n });
  }
  g.events.push({ kind: 'mined', x, y, m });
  if (state.foreman.target?.x === x && state.foreman.target.y === y) {
    state.foreman.target = null;
    state.foreman.work = 0;
  }
}

/** 0..1 progress on the foreman's current tile, for the crack overlay. */
export function digProgress(g: Game): number {
  const t = g.state.foreman.target;
  if (!t) return 0;
  const need = hardnessAt(g.world.hardnessOf(t.x, t.y), g.world.depth(t.y));
  return need > 0 ? Math.min(1, g.state.foreman.work / need) : 0;
}
