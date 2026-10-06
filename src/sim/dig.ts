// Digging: the Foreman's hand-mining with Vein Rush, and the shared tile-removal that pays out drops. canon §4.6, §4.7
import { MATERIALS, M, canDig, isMineable } from '../data/materials';
import { PICKS } from '../data/items';
import { VEIN_RUSH } from '../data/economy';
import { UPGRADE_FX } from '../data/upgrades';
import { deepMult, handsMult, rushStep } from './power';
import { lightFactor } from '../data/light';
import { BIOMES } from '../data/biomes';
import { NEIGH4 } from '../world/world';
import { D } from './decimal';
import { FOREMAN_RATE, hardnessAt } from './formulas';
import type { Game } from './game';
import { reach, workable } from './reach';
import { first, say } from './story';
import { maybeCollapse } from './village';

/** Depth (tiles) from which the Foreman's own digging depends on light: the Glowroot. */
const DARK_FROM_D = BIOMES[2]!.d0;

export function rushMult(chain: number, step: number = VEIN_RUSH.step): number {
  return Math.min(VEIN_RUSH.max, 1 + step * chain);
}

export function foremanRate(g: Game): number {
  const s = g.state;
  const power = PICKS[s.pickTier]?.power ?? 1;
  const t = s.foreman.target;
  const d = t ? g.world.depth(t.y) : 0;
  // ADR-017: below Topsoil the Foreman digs by whatever light reaches the face, like the miners
  const light = t && d >= DARK_FROM_D ? lightFactor(g.world.faceLight(t.x, t.y)) : 1;
  return (
    power * FOREMAN_RATE * handsMult(s) * deepMult(s, d) * light * rushMult(s.foreman.chain, rushStep(s))
  );
}

export function stepForeman(g: Game, dt: number): void {
  const { world } = g;
  const f = g.state.foreman;
  while (!f.target && f.queue.length) {
    const t = f.queue.shift()!;
    if (canDig(world.get(t.x, t.y), g.state.pickTier) && workable(g, t.x, t.y)) {
      f.target = t;
      f.work = 0;
    }
  }
  const t = f.target;
  if (!t) {
    f.idleMs += dt * 1000;
    if (f.idleMs > VEIN_RUSH.windowMs && f.chain > 0) f.chain = 0;
    return;
  }
  f.idleMs = 0;
  if (!isMineable(world.get(t.x, t.y))) {
    f.target = null;
    return;
  }
  // stand in the reachable open tile beside the face, nearest to where the foreman already is
  const r = reach(g);
  let best = Infinity;
  for (const [dx, dy] of NEIGH4) {
    const ax = t.x + dx;
    const ay = t.y + dy;
    if (!world.inside(ax, ay) || !r[ay * world.w + ax]) continue;
    const d = Math.abs(ax - f.x) + Math.abs(ay - f.y) + (dy === 0 ? 0 : 0.5);
    if (d < best) {
      best = d;
      f.x = ax;
      f.y = ay;
    }
  }
  f.work += dt * foremanRate(g);
  const need = hardnessAt(world.hardnessOf(t.x, t.y), world.depth(t.y));
  if (f.work >= need) mineTile(g, t.x, t.y, 'foreman');
}

/** Remove a tile and pay out its drop: straight into the pack for the Foreman, to the shaft bottom for miners. */
export function mineTile(g: Game, x: number, y: number, by: 'foreman' | 'miner'): void {
  const { world, state } = g;
  const m = world.get(x, y);
  const def = MATERIALS[m];
  world.set(x, y, M.AIR);
  state.stats.tilesMined++;
  state.stats.maxDepthD = Math.max(state.stats.maxDepthD, world.depth(y));
  state.stats.bestDepthD = Math.max(state.stats.bestDepthD, state.stats.maxDepthD);
  if (def?.drop) {
    const { res } = def.drop;
    const n =
      res === 'spores' && state.upgrades.glowcapGardens ? def.drop.n * UPGRADE_FX.glowcapGardens : def.drop.n;
    if (by === 'foreman') {
      state.res[res] = state.res[res].add(D(n));
      g.events.push({ kind: 'drop', x, y, res, n });
    } else if (res !== 'rubble') {
      state.underground[res] = state.underground[res].add(D(n));
    }
  }
  g.events.push({ kind: 'mined', x, y, m, by });
  if (by === 'foreman') {
    const f = state.foreman;
    if (def?.isOre) {
      const near = f.lastOre && Math.abs(f.lastOre.x - x) <= 1 && Math.abs(f.lastOre.y - y) <= 1;
      f.chain = near ? f.chain + 1 : 0;
      f.lastOre = { x, y };
      if (f.chain > 0) {
        g.events.push({ kind: 'rush', mult: rushMult(f.chain, rushStep(state)), x, y });
        if (f.chain >= 2) say(g, 'rush');
      }
    } else {
      f.chain = 0;
      f.lastOre = null;
    }
    if (f.target?.x === x && f.target.y === y) {
      f.target = null;
      f.work = 0;
    }
  }
  discoverVerses(g, x, y);
  maybeCollapse(g, x, y);
}

/** A verse is found the moment the rock beside its carving is opened. */
function discoverVerses(g: Game, x: number, y: number): void {
  const s = g.state;
  for (const c of g.world.carvings) {
    if (Math.abs(c.x - x) + Math.abs(c.y - y) !== 1) continue;
    if (s.verses.run[c.verse]) continue;
    const again = s.verses.known[c.verse] === true;
    s.verses.run[c.verse] = true;
    s.verses.known[c.verse] = true;
    s.story.events.push({ kind: 'verse', verse: c.verse, again });
    g.events.push({ kind: 'verse', verse: c.verse, x: c.x, y: c.y });
    first(g, `verse${c.verse}`);
    say(g, `verse${c.verse}`);
  }
}
