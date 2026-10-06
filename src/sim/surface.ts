// Holloway above: Tansy's fields, the cookhouse, the feast bell and Rook's woodlot. canon §17 (ADR-028)
// Everything up here only adds: nothing on the surface can slow the mine.
import {
  FEAST,
  FIELDS,
  MEALS,
  PIT_PROP,
  ROOTS,
  WOODLOT,
  WOOD_BUYS,
  type MealId,
  type WoodBuyId,
} from '../data/surface';
import { COST_GROWTH } from '../data/economy';
import { SHAFT_X } from '../data/constants';
import type { ResKey } from '../data/resources';
import type { World } from '../world/world';
import { D, type Decimal } from './decimal';
import { pay } from './economy';
import type { Game } from './game';
import { makeRng, hash3 } from './rng';
import type { GameState, Tree } from './state';
import { first, say } from './story';

type Costs = { res: ResKey; amount: Decimal }[];

// ---------- fields ----------

export function plotCost(s: GameState): Costs | null {
  if (s.surface.plots.length >= FIELDS.maxPlots) return null;
  // the first plot comes free with Tansy, so the nth bought plot is priced on n − 1
  const n = Math.max(0, s.surface.plots.length - 1);
  return [{ res: FIELDS.plotCost.res, amount: D(FIELDS.plotCost.n).mul(D(COST_GROWTH).pow(n)).ceil() }];
}

export function buyPlot(g: Game): boolean {
  const s = g.state;
  const c = plotCost(s);
  if (!s.surface.tansy || !c || !pay(s, c)) return false;
  s.surface.plots.push({ t: 0, golden: false });
  g.events.push({ kind: 'bought', what: 'plot' });
  return true;
}

export const plotX = (i: number): number => FIELDS.plotX0 + i;
export const ripe = (s: GameState): number => s.surface.plots.filter((p) => p.t >= 1).length;

/** Reap one ripe plot and sow it again. By hand it pays double. */
export function harvest(g: Game, i: number, byHand: boolean): boolean {
  const s = g.state;
  const p = s.surface.plots[i];
  if (!p || p.t < 1) return false;
  const n = FIELDS.yield * (byHand ? FIELDS.handMult : 1) * (p.golden ? FIELDS.goldenMult : 1);
  s.res.barley = s.res.barley.add(n);
  s.surface.feast += p.golden ? FEAST.golden : 1;
  s.surface.harvestsEver++;
  g.events.push({ kind: 'harvest', x: plotX(i), n, golden: p.golden });
  first(g, 'harvest');
  if (p.golden) say(g, 'goldenEar');
  p.t = 0;
  p.golden = false;
  return true;
}

// ---------- the cookhouse and the feast bell ----------

const mealDef = (id: MealId): (typeof MEALS)[number] => MEALS.find((m) => m.id === id)!;

export function mealCost(s: GameState, id: MealId): Costs {
  const m = mealDef(id);
  return [{ res: 'barley', amount: D(m.base).mul(D(m.growth).pow(s.surface.meals[id])).ceil() }];
}

export function eatMeal(g: Game, id: MealId): boolean {
  const s = g.state;
  if (!s.surface.tansy || !pay(s, mealCost(s, id))) return false;
  s.surface.meals[id]++;
  g.events.push({ kind: 'bought', what: `meal:${id}` });
  first(g, `meal_${id}`);
  return true;
}

/** Miners ×, from Miner's bread and cottages. */
export function minerFood(s: GameState): number {
  return (1 + mealDef('bread').per * s.surface.meals.bread) * woodMult(s, 'cottage');
}

/** Hand-mining ×, from Foreman's porridge. */
export function handFood(s: GameState): number {
  return 1 + mealDef('porridge').per * s.surface.meals.porridge;
}

export function feastNeed(s: GameState): number {
  return Math.ceil(FEAST.need * Math.pow(FEAST.growth, s.surface.feasts));
}

export const feasting = (s: GameState): boolean => s.t < s.surface.feastUntil;

/** Every worker ×, while a feast is on. */
export const feastMult = (s: GameState): number => (feasting(s) ? FEAST.mult : 1);

export function ringFeast(g: Game): boolean {
  const s = g.state;
  if (feasting(s) || s.surface.feast < feastNeed(s)) return false;
  s.surface.feast = 0;
  s.surface.feasts++;
  s.surface.feastUntil = s.t + FEAST.seconds * 1000;
  g.events.push({ kind: 'bought', what: 'feast' });
  first(g, 'feast');
  say(g, 'feast');
  return true;
}

// ---------- the woodlot ----------

/** 0 sapling, 1 young, 2 grown, 3 old. */
export function treeStage(t: Tree): number {
  let st = 0;
  for (const s of WOODLOT.stageS) if (t.age >= s) st++;
  return st;
}

export const isElder = (t: Tree): boolean => t.stood >= WOODLOT.elderAfter;

export function saplingCost(s: GameState): Costs | null {
  if (s.surface.trees.length >= WOODLOT.slots.length) return null;
  return [
    {
      res: WOODLOT.saplingCost.res,
      amount: D(WOODLOT.saplingCost.n).mul(D(COST_GROWTH).pow(s.surface.trees.length)).ceil(),
    },
  ];
}

function freeSlot(s: GameState): number {
  for (let i = 0; i < WOODLOT.slots.length; i++) if (!s.surface.trees.some((t) => t.slot === i)) return i;
  return -1;
}

export function plantSapling(g: Game): boolean {
  const s = g.state;
  const c = saplingCost(s);
  const slot = freeSlot(s);
  if (!s.surface.rook || !c || slot < 0 || !pay(s, c)) return false;
  s.surface.trees.push({ slot, age: 0, stood: 0 });
  g.events.push({ kind: 'bought', what: 'sapling' });
  return true;
}

/** Fell a tree for timber; a sapling goes straight back in. Elders are never felled. */
export function chop(g: Game, i: number, byHand: boolean): boolean {
  const s = g.state;
  const t = s.surface.trees[i];
  if (!t || !s.surface.rook || isElder(t)) return false;
  const n = WOODLOT.chop[treeStage(t)]! * (byHand ? WOODLOT.handMult : 1);
  if (n <= 0) return false;
  s.res.timber = s.res.timber.add(n);
  s.surface.chopsEver++;
  g.events.push({ kind: 'chop', x: WOODLOT.slots[t.slot]!, n });
  first(g, 'chop');
  t.age = 0;
  t.stood = 0;
  return true;
}

const woodDef = (id: WoodBuyId): (typeof WOOD_BUYS)[number] => WOOD_BUYS.find((b) => b.id === id)!;

export function woodCost(s: GameState, id: WoodBuyId): Costs {
  const b = woodDef(id);
  return [{ res: 'timber', amount: D(b.base).mul(D(b.growth).pow(s.surface.wood[id])).ceil() }];
}

export function buyWood(g: Game, id: WoodBuyId): boolean {
  const s = g.state;
  if (!s.surface.rook || !pay(s, woodCost(s, id))) return false;
  s.surface.wood[id]++;
  g.events.push({ kind: 'bought', what: `wood:${id}` });
  return true;
}

export function woodMult(s: GameState, id: WoodBuyId): number {
  return 1 + woodDef(id).per * s.surface.wood[id];
}

/** canon §17.3 pit props: a support costs timber when there is timber to spare, else bricks. */
export function supportFromTimber(s: GameState, brickCost: number): boolean {
  const t = s.res.timber;
  return (
    t.gte(PIT_PROP.n) && (s.res.brick.lt(brickCost) || t.div(PIT_PROP.n).gte(s.res.brick.div(brickCost)))
  );
}

// ---------- the tick ----------

export function stepSurface(g: Game, dt: number): void {
  const s = g.state;
  const sf = s.surface;
  // Tansy comes with the first miner, bringing the first plot
  if (!sf.tansy && s.miners.length > 0) {
    sf.tansy = true;
    if (!sf.plots.length) sf.plots.push({ t: 0, golden: false });
    first(g, 'tansy');
    say(g, 'tansyArrives');
  }
  // Rook comes at the Kiln's depth, or at once to a woodlot that stood through the Cave-in
  if (!sf.rook && (s.stats.maxDepthD >= WOODLOT.unlockD || sf.trees.length > 0)) {
    sf.rook = true;
    for (let k = sf.trees.length; k < WOODLOT.freeSaplings; k++)
      sf.trees.push({ slot: freeSlot(s), age: 0, stood: 0 });
    first(g, 'rook');
    say(g, 'rookArrives');
    if (sf.trees.some(isElder)) say(g, 'elder');
  }
  // crops ripen; a ripe ear may come up golden
  const grow = (dt * (feasting(s) ? FEAST.grow : 1)) / FIELDS.ripenS;
  let rng: ReturnType<typeof makeRng> | null = null;
  for (const p of sf.plots) {
    if (p.t >= 1) continue;
    p.t = Math.min(1, p.t + grow);
    if (p.t >= 1) {
      rng ??= makeRng(s.rng);
      p.golden = rng.next() < FIELDS.goldenChance;
    }
  }
  if (rng) s.rng = rng.state();
  // trees grow whatever happens; elders drop timber
  let elders = 0;
  for (const t of sf.trees) {
    t.age += dt;
    if (isElder(t)) elders++;
  }
  if (elders) s.res.timber = s.res.timber.add((elders * WOODLOT.elderTimberPerMin * dt) / 60);
  // Tansy's hands: one ripe plot every couple of seconds, and the bell when it is full
  if (s.helpers.tansy && sf.tansy) {
    sf.tansyAcc += dt;
    while (sf.tansyAcc >= FIELDS.tansyEveryS) {
      sf.tansyAcc -= FIELDS.tansyEveryS;
      const i = sf.plots.findIndex((p) => p.t >= 1);
      if (i < 0) {
        sf.tansyAcc = 0;
        break;
      }
      harvest(g, i, false);
    }
    if (sf.autoFeast) ringFeast(g);
  }
  // Rook's axe, about once a second: fells old trees and replants. Trees that stood through a Cave-in are left to grow.
  if (s.helpers.rook && sf.rook && (s.t % 1000 === 0 || dt >= 1))
    sf.trees.forEach((t, i) => {
      if (t.stood === 0 && treeStage(t) >= WOODLOT.stageS.length) chop(g, i, false);
    });
}

/** A tap above the grass: harvest a ripe plot or fell a tree. True if the tap meant something up here. */
export function surfaceTap(g: Game, x: number, y: number): boolean {
  const s = g.state;
  const surf = g.world.surf[x];
  if (surf === undefined || y >= surf) return false;
  const i = x - FIELDS.plotX0;
  if (i >= 0 && i < s.surface.plots.length && y >= surf - 2) {
    harvest(g, i, true);
    return true;
  }
  const ti = s.surface.trees.findIndex((t) => Math.abs(x + 0.5 - (WOODLOT.slots[t.slot]! + 0.5)) <= 1);
  if (ti >= 0 && y >= surf - 3) {
    chop(g, ti, true);
    return true;
  }
  return false;
}

/** What the village forgets at a Cave-in. Trees remember, and count it. */
export function resetSurface(s: GameState): void {
  const sf = s.surface;
  for (const t of sf.trees) t.stood++;
  sf.tansy = false;
  sf.rook = false;
  sf.plots = [];
  sf.meals = { bread: 0, porridge: 0 };
  sf.wood = { hearth: 0, cottage: 0 };
  sf.feast = 0;
  sf.feasts = 0;
  sf.feastUntil = 0;
  sf.tansyAcc = 0;
}

// ---------- elder roots ----------

/** canon §17.4 the tiles an elder's roots run through, worked out from the trees (nothing about it is saved). */
export function rootTiles(s: GameState, w: World): number[] {
  const out: number[] = [];
  for (const t of s.surface.trees) {
    if (!isElder(t)) continue;
    const rows = ROOTS.rowsPerCaveIn * (t.stood - WOODLOT.elderAfter + 1);
    let x = Math.round(WOODLOT.slots[t.slot]!);
    let y = w.surf[x]! + 1;
    for (let r = 0; r < rows && y < w.h - 1; r++) {
      out.push(y * w.w + x);
      y++;
      // the roots wander, and lean toward the shaft where the digging is
      const v = hash3(t.slot, r, s.seed);
      if (r % 2 === 1) x += Math.sign(SHAFT_X - x);
      else if (v < 0.25) x--;
      else if (v > 0.75) x++;
      x = Math.max(1, Math.min(w.w - 2, x));
    }
  }
  return out;
}
