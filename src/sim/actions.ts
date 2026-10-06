// Everything the player can ask for. The UI dispatches these; only the sim applies them. dev-bible §1.2
import { tally } from './tally';
import { CHEST_LOOT, TORCH_CRAFT, type BuildingId, type CraftId, type Recipe } from '../data/economy';
import { DIG_QUEUE_MAX } from '../data/constants';
import { MIN_PICK, canDig, isMineable } from '../data/materials';
import { PICKS } from '../data/items';
import { UPGRADES } from '../data/upgrades';
import type { ObjKind } from '../data/objects';
import { caveIn } from './cavein';
import { chooseEnding, type Ending } from './ending';
import type { CharmId } from '../data/charms';
import { equip, weave } from './charms';
import type { HelperId } from '../data/helpers';
import { hireHelper, hitPest } from './helpers';
import { D } from './decimal';
import { minerCost, nextHaul, nextPick, pay, torchCost, whetstoneCost } from './economy';
import { syncWorld, type Game } from './game';
import { reachable, workable } from './reach';
import { coolCache } from './heat';
import { makeRng } from './rng';
import type { Tile } from './state';
import { first, say } from './story';
import { buyBuilding, craft } from './village';
import type { MealId, WoodBuyId } from '../data/surface';
import { buyPlot, buyWood, chop, eatMeal, harvest, plantSapling, ringFeast, surfaceTap } from './surface';

export type Tool = 'dig' | 'torch' | 'lantern' | 'support' | 'pump' | 'vent';

/** Tools that place an object from stock. */
export const PLACE_TOOLS: readonly Exclude<Tool, 'dig'>[] = ['torch', 'lantern', 'support', 'pump', 'vent'];

export type Action =
  | { type: 'dig'; x: number; y: number }
  | { type: 'digPath'; tiles: Tile[] }
  | { type: 'cancelDig' }
  /** Take tiles back out of the Foreman's dig queue (tap or drag over queued tiles). */
  | { type: 'unqueue'; tiles: Tile[] }
  /** A tap on the world: clears a pest, opens a chest, places or picks up a torch, or digs. */
  | { type: 'tap'; x: number; y: number; tool: Tool }
  | { type: 'hireMiner' }
  | { type: 'buyPick' }
  | { type: 'buyHaul' }
  | { type: 'whetstone' }
  | { type: 'craftTorches' }
  | { type: 'craft'; id: CraftId }
  | { type: 'buyBuilding'; id: BuildingId }
  | { type: 'setRecipe'; recipe: Recipe }
  | { type: 'buyUpgrade'; id: string }
  | { type: 'weave'; id: CharmId }
  | { type: 'equip'; id: CharmId }
  | { type: 'hireHelper'; id: HelperId }
  /** Holloway above (canon §17). */
  | { type: 'harvest'; plot: number }
  | { type: 'chop'; tree: number }
  | { type: 'buyPlot' }
  | { type: 'plantSapling' }
  | { type: 'eatMeal'; id: MealId }
  | { type: 'buyWood'; id: WoodBuyId }
  | { type: 'ringFeast' }
  | { type: 'autoFeast'; on: boolean }
  | { type: 'caveIn' }
  /** At the Hollow Heart, with Verse XII sung: seal the shaft or sing the last verse. */
  | { type: 'chooseEnding'; which: Ending }
  /** The UI has shown the oldest story event. */
  | { type: 'ackStory' }
  /** Remember, for good, that the player has seen something: a tip (`tip:<id>`) or a Village tab (`tab:<id>`). */
  | { type: 'note'; key: string };

export function queued(g: Game, x: number, y: number): boolean {
  const f = g.state.foreman;
  return (f.target?.x === x && f.target.y === y) || f.queue.some((t) => t.x === x && t.y === y);
}

function enqueue(g: Game, x: number, y: number, mustBeWorkable: boolean): boolean {
  const { world } = g;
  const f = g.state.foreman;
  const m = world.get(x, y);
  if (!isMineable(m)) return false;
  if (queued(g, x, y)) return true;
  if (!canDig(m, g.state.pickTier)) {
    // canon §8.1: too hard for this pick; say which pick it wants, once
    g.events.push({ kind: 'refused', x, y, needs: PICKS[MIN_PICK[m]!]!.name });
    say(g, 'tooHard');
    return false;
  }
  if (mustBeWorkable && !workable(g, x, y)) {
    g.events.push({ kind: 'refused', x, y });
    return false;
  }
  if (f.queue.length >= DIG_QUEUE_MAX) return false;
  f.queue.push({ x, y });
  return true;
}

function tap(g: Game, x: number, y: number, tool: Tool): void {
  const s = g.state;
  if (surfaceTap(g, x, y)) return;
  const pest = s.pests.find((p) => p.x === x && p.y === y);
  if (pest) {
    hitPest(g, pest);
    return;
  }
  const key = String(g.world.idx(x, y));
  const obj = s.world.objects[key];
  if (obj === 'chest' && reachable(g, x, y)) {
    openChest(g, x, y, key);
    return;
  }
  if (tool !== 'dig') {
    place(g, x, y, key, tool, obj);
    return;
  }
  // tapping a tile that is already queued takes it back out
  if (queued(g, x, y)) {
    unqueue(g, [{ x, y }]);
    return;
  }
  enqueue(g, x, y, true);
}

function unqueue(g: Game, tiles: readonly Tile[]): void {
  const f = g.state.foreman;
  const hit = (t: Tile): boolean => tiles.some((q) => q.x === t.x && q.y === t.y);
  f.queue = f.queue.filter((t) => !hit(t));
  if (f.target && hit(f.target)) {
    f.target = null;
    f.work = 0;
  }
}

/** Place an object from stock on open ground, or pick up one of the same kind. */
function place(
  g: Game,
  x: number,
  y: number,
  key: string,
  kind: ObjKind & Tool,
  obj: ObjKind | undefined,
): void {
  const s = g.state;
  const stock = kind as 'torch' | 'lantern' | 'support' | 'pump' | 'vent';
  if (obj === kind) {
    delete s.world.objects[key];
    s.res[stock] = s.res[stock].add(1);
    g.world.touch(x, y);
    coolCache(g);
    return;
  }
  if (!obj && g.world.isAir(x, y) && y > g.world.surf[x]! && reachable(g, x, y) && s.res[stock].gte(1)) {
    s.res[stock] = s.res[stock].sub(1);
    s.world.objects[key] = kind;
    g.world.touch(x, y);
    coolCache(g);
    first(g, kind);
    if (!s.story.ever.includes(`used:${kind}`)) s.story.ever.push(`used:${kind}`);
  }
}

function openChest(g: Game, x: number, y: number, key: string): void {
  const s = g.state;
  const rng = makeRng(s.rng);
  const loot = CHEST_LOOT[rng.int(0, CHEST_LOOT.length - 1)]!;
  const n = rng.int(loot.lo, loot.hi);
  s.rng = rng.state();
  delete s.world.objects[key];
  s.res[loot.res] = s.res[loot.res].add(n);
  s.stats.chests++;
  tally(g, 'chests', n);
  s.story.events.push({ kind: 'chest', res: loot.res, n: String(n) });
  g.events.push({ kind: 'chest', x, y });
  g.world.touch(x, y);
  say(g, 'chest');
}

export function apply(g: Game, a: Action): void {
  const s = g.state;
  switch (a.type) {
    case 'dig':
      enqueue(g, a.x, a.y, true);
      return;
    case 'digPath': {
      // The first tile must be workable now; the rest open up as the path is dug.
      let firstTile = true;
      for (const t of a.tiles) {
        if (!enqueue(g, t.x, t.y, firstTile)) {
          if (firstTile) return;
          continue;
        }
        firstTile = false;
      }
      return;
    }
    case 'unqueue':
      unqueue(g, a.tiles);
      return;
    case 'cancelDig':
      s.foreman.queue = [];
      s.foreman.target = null;
      s.foreman.work = 0;
      return;
    case 'tap':
      tap(g, a.x, a.y, a.tool);
      return;
    case 'hireMiner': {
      const c = minerCost(s);
      if (!pay(s, [{ res: c.res, amount: c.amount }])) return;
      const id = s.nextId++;
      s.miners.push({ id, x: s.foreman.x, y: s.foreman.y, target: null, work: 0, stalledBy: null });
      g.events.push({ kind: 'bought', what: 'miner' });
      return;
    }
    case 'buyPick': {
      const c = nextPick(s);
      if (!c || !pay(s, c)) return;
      s.pickTier++;
      s.stats.bestPick = Math.max(s.stats.bestPick, s.pickTier);
      g.events.push({ kind: 'bought', what: 'pick' });
      return;
    }
    case 'whetstone':
      if (!pay(s, whetstoneCost(s))) return;
      s.whetstone++;
      g.events.push({ kind: 'bought', what: 'whetstone' });
      return;
    case 'buyHaul': {
      const c = nextHaul(s);
      if (!c || !pay(s, c)) return;
      s.haulTier++;
      g.events.push({ kind: 'bought', what: 'haul' });
      return;
    }
    case 'craftTorches':
      if (!pay(s, torchCost())) return;
      s.res.torch = s.res.torch.add(D(TORCH_CRAFT.makes));
      g.events.push({ kind: 'bought', what: 'torch' });
      return;
    case 'craft':
      craft(g, a.id);
      return;
    case 'buyBuilding':
      buyBuilding(g, a.id);
      return;
    case 'setRecipe':
      if (s.forge.recipe === a.recipe) return;
      s.forge.recipe = a.recipe;
      s.forge.progress = 0;
      return;
    case 'buyUpgrade': {
      const u = UPGRADES.find((x) => x.id === a.id);
      if (!u || s.upgrades[u.id] || (u.requires && !s.upgrades[u.requires])) return;
      if (s.echoes.lt(u.cost)) return;
      s.echoes = s.echoes.sub(u.cost);
      s.upgrades[u.id] = 1;
      if (u.id === 'rememberedRope' && s.haulTier < 1) s.haulTier = 1;
      if (u.id === 'lamplit' || u.id === 'steadyFlame') syncWorld(s, g.world);
      return;
    }
    case 'weave':
      weave(g, a.id);
      return;
    case 'equip':
      equip(g, a.id);
      return;
    case 'hireHelper':
      hireHelper(g, a.id);
      return;
    case 'harvest':
      harvest(g, a.plot, true);
      return;
    case 'chop':
      chop(g, a.tree, true);
      return;
    case 'buyPlot':
      buyPlot(g);
      return;
    case 'plantSapling':
      plantSapling(g);
      return;
    case 'eatMeal':
      eatMeal(g, a.id);
      return;
    case 'buyWood':
      buyWood(g, a.id);
      return;
    case 'ringFeast':
      ringFeast(g);
      return;
    case 'autoFeast':
      s.surface.autoFeast = a.on;
      return;
    case 'caveIn':
      caveIn(g);
      return;
    case 'chooseEnding':
      chooseEnding(g, a.which);
      return;
    case 'ackStory':
      s.story.events.shift();
      return;
    case 'note':
      if (/^(tip|tab):[a-z]+$/.test(a.key) && !s.story.ever.includes(a.key)) s.story.ever.push(a.key);
      return;
  }
}
