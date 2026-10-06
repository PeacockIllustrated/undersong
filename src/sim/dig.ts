// Digging: the Foreman's hand-mining with Vein Rush, and the shared tile-removal that pays out drops. canon §4.6, §4.7
import { tally } from './tally';
import { MATERIALS, M, canDig, isMineable } from '../data/materials';
import { VEIN_RUSH } from '../data/economy';
import { UPGRADE_FX } from '../data/upgrades';
import { charm, deepMult, handsMult, pickPower, rushStep } from './power';
import { lightFactor } from '../data/light';
import { BIOMES } from '../data/biomes';
import { COARSE_STEP_S, FT_PER_TILE } from '../data/constants';
import { VERSE_CACHE } from '../data/helpers';
import { NEIGH4, type Carving } from '../world/world';
import { D } from './decimal';
import { FOREMAN_RATE, hardnessAt } from './formulas';
import type { Game } from './game';
import { reach, workable } from './reach';
import { first, say } from './story';
import { maybeCollapse } from './village';
import { GOLEMS } from '../data/water';
import { makeRng } from './rng';
import { heatAt, heatFactor } from './heat';
import { HEAT } from '../data/heat';

/** Depth (tiles) from which the Foreman's own digging depends on light: the Glowroot. */
const DARK_FROM_D = BIOMES[2]!.d0;

export function rushMult(chain: number, step: number = VEIN_RUSH.step): number {
  return Math.min(VEIN_RUSH.max, 1 + step * chain);
}

export function foremanRate(g: Game): number {
  const s = g.state;
  const power = pickPower(s);
  const t = s.foreman.target;
  const d = t ? g.world.depth(t.y) : 0;
  // ADR-017: below Topsoil the Foreman digs by whatever light reaches the face, like the miners
  const light = t && d >= DARK_FROM_D ? lightFactor(g.world.faceLight(t.x, t.y)) : 1;
  // canon §15: heat slows the Foreman too, but never stops him: a vent is always within reach of his hands
  const hf = t ? heatFactor(heatAt(g, t.x, t.y)) : 1;
  const heat = hf === 0 ? HEAT.foremanHot : hf;
  return (
    power *
    FOREMAN_RATE *
    handsMult(s) *
    deepMult(s, d) *
    light *
    heat *
    rushMult(s.foreman.chain, rushStep(s))
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
  const rate = foremanRate(g);
  const need = hardnessAt(world.hardnessOf(t.x, t.y), world.depth(t.y));
  // a long catch-up step finishes this tile and spends the rest on the next one in the queue
  if (dt >= COARSE_STEP_S && rate > 0 && f.work + rate * dt > need) {
    const used = (need - f.work) / rate;
    mineTile(g, t.x, t.y, 'foreman');
    stepForeman(g, dt - used);
    return;
  }
  f.work += dt * rate;
  if (f.work >= need) mineTile(g, t.x, t.y, 'foreman');
}

/** Remove a tile and pay out its drop: straight into the pack for the Foreman, to the shaft bottom for miners. */
export function mineTile(g: Game, x: number, y: number, by: 'foreman' | 'miner'): void {
  const { world, state } = g;
  const m = world.get(x, y);
  const def = MATERIALS[m];
  world.set(x, y, M.AIR);
  state.stats.tilesMined++;
  const best = state.stats.bestDepthD;
  state.stats.maxDepthD = Math.max(state.stats.maxDepthD, world.depth(y));
  state.stats.bestDepthD = Math.max(state.stats.bestDepthD, state.stats.maxDepthD);
  // past your old best: say so the first time, then every 100 ft
  if (state.stats.caveIns > 0 && state.stats.bestDepthD > best) {
    const k = state.stats.firsts.record === undefined || state.stats.bestDepthD % 25 === 0;
    if (k) g.events.push({ kind: 'record', ft: state.stats.bestDepthD * FT_PER_TILE });
    first(g, 'record');
  }
  if (def?.drop) {
    const { res } = def.drop;
    const n =
      res === 'spores' && state.upgrades.glowcapGardens ? def.drop.n * UPGRADE_FX.glowcapGardens : def.drop.n;
    if (by === 'foreman') {
      state.res[res] = state.res[res].add(D(n));
      g.events.push({ kind: 'drop', x, y, res, n });
      if (res !== 'rubble') tally(g, 'foreman', n);
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
  if (m === M.CRYSTAL) maybeGolem(g, x, y);
}

/** canon §12: mining resonant crystal can wake a shard golem, which stops every miner near it until tapped down. */
function maybeGolem(g: Game, x: number, y: number): void {
  const s = g.state;
  if (g.offline) return;
  const rng = makeRng(s.rng);
  const roll = rng.next();
  s.rng = rng.state();
  if (roll >= GOLEMS.chance * charm(s, 'crystal')) return;
  const id = s.nextId++;
  s.pests.push({ id, kind: 'golem', x, y, born: s.t, minerId: null, hp: GOLEMS.hp });
  for (const mn of s.miners)
    if (mn.stalledBy === null && Math.abs(mn.x - x) + Math.abs(mn.y - y) <= GOLEMS.radius) mn.stalledBy = id;
  g.events.push({ kind: 'pest', x, y, cleared: false });
  say(g, 'golem');
}

/** A verse is found the moment the rock beside its carving is opened. */
function discoverVerses(g: Game, x: number, y: number): void {
  for (const c of g.world.carvings) {
    if (Math.abs(c.x - x) + Math.abs(c.y - y) !== 1) continue;
    readVerse(g, c);
  }
}

/** Find a verse this run: it goes in the Survey Book and the village reacts. */
export function readVerse(g: Game, c: Carving): void {
  const s = g.state;
  if (s.verses.run[c.verse]) return;
  const again = s.verses.known[c.verse] === true;
  s.verses.run[c.verse] = true;
  s.verses.known[c.verse] = true;
  // ADR-020: a verse is loot. It pays out bars on the spot
  const cache = VERSE_CACHE[c.verse]!;
  s.res[cache.res] = s.res[cache.res].add(cache.n);
  g.events.push({ kind: 'drop', x: c.x, y: c.y, res: cache.res, n: cache.n });
  s.story.events.push({ kind: 'verse', verse: c.verse, again });
  g.events.push({ kind: 'verse', verse: c.verse, x: c.x, y: c.y });
  first(g, `verse${c.verse}`);
  say(g, `verse${c.verse}`);
}
