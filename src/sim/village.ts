// Act II village systems: the Kiln, the Lamp-works and its Lumen budget, lantern moths and small collapses. canon §11
import {
  BUILDINGS,
  COLLAPSE,
  CRAFTS,
  KILN,
  LAMPWORKS,
  MOTHS,
  type BuildingId,
  type CraftId,
} from '../data/economy';
import { SHAFT_X } from '../data/constants';
import { M } from '../data/materials';
import { OBJECTS } from '../data/objects';
import type { ResKey } from '../data/resources';
import { D, Decimal } from './decimal';
import { canPay, flat, pay, scaled } from './economy';
import type { Game } from './game';
import { lumenMult, pestMult, upkeepMult } from './power';
import { reach } from './reach';
import { makeRng } from './rng';
import type { GameState } from './state';
import { first, say } from './story';

export function buildingDef(id: BuildingId): (typeof BUILDINGS)[number] {
  return BUILDINGS.find((b) => b.id === id)!;
}

export function buildingCost(s: GameState, id: BuildingId): { res: ResKey; amount: Decimal }[] {
  const owned = s.buildings[id];
  return buildingDef(id).cost.map((c) => ({ res: c.res, amount: scaled(c, owned) }));
}

export function buildingOffered(s: GameState, id: BuildingId): boolean {
  return s.buildings[id] > 0 || s.stats.maxDepthD >= buildingDef(id).unlockD;
}

export function buyBuilding(g: Game, id: BuildingId): boolean {
  const s = g.state;
  if (!buildingOffered(s, id)) return false;
  if (!pay(s, buildingCost(s, id))) return false;
  s.buildings[id]++;
  g.events.push({ kind: 'bought', what: id });
  first(g, id);
  if (s.buildings[id] === 1) say(g, `built_${id}`);
  return true;
}

export const craftCost = (id: CraftId): ReturnType<typeof flat> => flat(CRAFTS[id].cost);

export function canCraft(s: GameState, id: CraftId): boolean {
  return canPay(s, craftCost(id));
}

export function craft(g: Game, id: CraftId): boolean {
  const s = g.state;
  if (!pay(s, craftCost(id))) return false;
  s.res[id] = s.res[id].add(CRAFTS[id].makes);
  g.events.push({ kind: 'bought', what: id });
  return true;
}

/** canon §11 Kiln: each level bakes 4 rubble into a brick every 3 s. */
export function stepKiln(g: Game, dt: number): void {
  const s = g.state;
  const lv = s.buildings.kiln;
  if (lv <= 0 || s.res.rubble.lt(KILN.rubble)) {
    s.kilnProgress = 0;
    return;
  }
  s.kilnProgress += dt * lv;
  while (s.kilnProgress >= KILN.seconds && s.res.rubble.gte(KILN.rubble)) {
    s.kilnProgress -= KILN.seconds;
    s.res.rubble = s.res.rubble.sub(KILN.rubble);
    s.res.brick = s.res.brick.add(1);
    first(g, 'brick');
  }
}

/** canon §11 Lamp-works: each level turns a spore into Lumen every second. */
export function stepLampworks(g: Game, dt: number): void {
  const s = g.state;
  const lv = s.buildings.lampworks;
  if (lv <= 0 || s.res.spores.lt(LAMPWORKS.spores)) {
    s.lampProgress = 0;
    return;
  }
  s.lampProgress += dt * lv;
  while (s.lampProgress >= LAMPWORKS.seconds && s.res.spores.gte(LAMPWORKS.spores)) {
    s.lampProgress -= LAMPWORKS.seconds;
    s.res.spores = s.res.spores.sub(LAMPWORKS.spores);
    s.res.lumen = s.res.lumen.add(D(LAMPWORKS.lumen * lumenMult(s)));
    first(g, 'lumen');
  }
}

/** Lantern tiles placed in the mine. */
export function lanterns(g: Game): number[] {
  const out: number[] = [];
  for (const [k, o] of Object.entries(g.state.world.objects)) if (o === 'lantern') out.push(Number(k));
  return out;
}

/** Lumen burned per second by the lanterns that are lit now. */
export function lumenUpkeep(g: Game): number {
  const lit = lanterns(g).filter((i) => !g.world.dimmed.has(i)).length;
  return lit * LAMPWORKS.upkeepPerLantern * upkeepMult(g.state);
}

/** Burn Lumen; when it runs out every lantern goes dark until there is Lumen again. */
export function stepLanterns(g: Game, dt: number): void {
  const s = g.state;
  const w = g.world;
  const burn = lumenUpkeep(g) * dt;
  if (burn > 0) s.res.lumen = Decimal.max(0, s.res.lumen.sub(burn));
  const lit = s.res.lumen.gt(0);
  if (lit !== w.lanternsLit) {
    w.lanternsLit = lit;
    w.touchAll();
    if (!lit && lanterns(g).length) say(g, 'lanternsOut');
  }
  // lantern moths settle on lit lanterns (canon §11)
  if (!lit || g.offline) return;
  const rng = makeRng(s.rng);
  const p = MOTHS.chancePerSec * pestMult(s) * dt;
  for (const i of lanterns(g)) {
    if (w.dimmed.has(i) || rng.next() >= p) continue;
    const x = i % w.w;
    const y = (i - x) / w.w;
    const id = s.nextId++;
    s.pests.push({ id, kind: 'moth', x, y, born: s.t, minerId: null });
    w.dimmed.add(i);
    w.touch(x, y);
    g.events.push({ kind: 'pest', x, y, cleared: false });
    say(g, 'moth');
  }
  s.rng = rng.state();
}

/** Is there a support close enough to hold the roof over this tile? */
function supported(g: Game, x: number, y: number): boolean {
  const r = OBJECTS.support.radius!;
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) if (g.world.objectAt(x + dx, y + dy) === 'support') return true;
  return false;
}

/** canon §11: a wide, unsupported chamber below Topsoil can drop part of its roof when a tile is opened. */
export function maybeCollapse(g: Game, x: number, y: number): void {
  const s = g.state;
  const w = g.world;
  if (g.offline || w.depth(y) < COLLAPSE.fromD) return;
  const R = COLLAPSE.radius;
  const open: { x: number; y: number }[] = [];
  for (let dy = -R; dy <= R; dy++)
    for (let dx = -R; dx <= R; dx++) if (w.isAir(x + dx, y + dy)) open.push({ x: x + dx, y: y + dy });
  if (open.length < COLLAPSE.openAround || supported(g, x, y)) return;
  const rng = makeRng(s.rng);
  const roll = rng.next();
  s.rng = rng.state();
  if (roll >= COLLAPSE.chance) return;

  const busy = (t: { x: number; y: number }): boolean =>
    (s.foreman.x === t.x && s.foreman.y === t.y) ||
    s.miners.some((m) => m.x === t.x && m.y === t.y) ||
    t.x === SHAFT_X ||
    w.objectAt(t.x, t.y) !== undefined;
  // the roof falls first
  const fall = open
    .filter((t) => !busy(t))
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .slice(0, COLLAPSE.fill);
  if (!fall.length) return;
  for (const t of fall) w.set(t.x, t.y, M.RUBBLE);
  // never trap anyone: if the fall cuts the village off, the roof holds after all
  const r = reach(g);
  const cut = [s.foreman, ...s.miners].some((p) => !r[p.y * w.w + p.x]);
  if (cut) {
    for (const t of fall) w.set(t.x, t.y, M.AIR);
    return;
  }
  for (const m of s.miners)
    if (m.target && fall.some((t) => t.x === m.target!.x && t.y === m.target!.y)) m.target = null;
  s.stats.collapses++;
  g.events.push({ kind: 'collapse', x, y });
  s.story.events.push({ kind: 'collapse', x, y });
  say(g, 'collapse');
}
