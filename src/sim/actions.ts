// Everything the player can ask for. The UI dispatches these; only the sim applies them. dev-bible §1.2
import { CHEST_LOOT, TORCH_CRAFT, type Recipe } from '../data/economy';
import { DIG_QUEUE_MAX } from '../data/constants';
import { isMineable } from '../data/materials';
import { UPGRADE_FX, UPGRADES } from '../data/upgrades';
import { caveIn } from './cavein';
import { D } from './decimal';
import { minerCost, nextHaul, nextPick, pay, torchCost } from './economy';
import type { Game } from './game';
import { reachable, workable } from './reach';
import { makeRng } from './rng';
import type { Tile } from './state';
import { first, say } from './story';

export type Tool = 'dig' | 'torch';

export type Action =
  | { type: 'dig'; x: number; y: number }
  | { type: 'digPath'; tiles: Tile[] }
  | { type: 'cancelDig' }
  /** A tap on the world: clears a pest, opens a chest, places or picks up a torch, or digs. */
  | { type: 'tap'; x: number; y: number; tool: Tool }
  | { type: 'hireMiner' }
  | { type: 'buyPick' }
  | { type: 'buyHaul' }
  | { type: 'craftTorches' }
  | { type: 'setRecipe'; recipe: Recipe }
  | { type: 'buyUpgrade'; id: string }
  | { type: 'caveIn' }
  /** The UI has shown the oldest story event. */
  | { type: 'ackStory' };

function queued(g: Game, x: number, y: number): boolean {
  const f = g.state.foreman;
  return (f.target?.x === x && f.target.y === y) || f.queue.some((t) => t.x === x && t.y === y);
}

function enqueue(g: Game, x: number, y: number, mustBeWorkable: boolean): boolean {
  const { world } = g;
  const f = g.state.foreman;
  if (!isMineable(world.get(x, y))) return false;
  if (queued(g, x, y)) return true;
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
  const pest = s.pests.find((p) => p.x === x && p.y === y);
  if (pest) {
    s.pests = s.pests.filter((p) => p !== pest);
    for (const m of s.miners) if (m.stalledBy === pest.id) m.stalledBy = null;
    g.events.push({ kind: 'pest', x, y, cleared: true });
    return;
  }
  const key = String(g.world.idx(x, y));
  const obj = s.world.objects[key];
  if (obj === 'chest' && reachable(g, x, y)) {
    openChest(g, x, y, key);
    return;
  }
  if (tool === 'torch') {
    if (obj === 'torch') {
      delete s.world.objects[key];
      s.res.torch = s.res.torch.add(1);
      g.world.touch(x, y);
      return;
    }
    if (!obj && g.world.isAir(x, y) && y > g.world.surf[x]! && reachable(g, x, y) && s.res.torch.gte(1)) {
      s.res.torch = s.res.torch.sub(1);
      s.world.objects[key] = 'torch';
      g.world.touch(x, y);
      first(g, 'torch');
    }
    return;
  }
  enqueue(g, x, y, true);
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
      g.events.push({ kind: 'bought', what: 'pick' });
      return;
    }
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
      if (u.id === 'lamplit') {
        g.world.torchMult = UPGRADE_FX.lamplit;
        g.world.touchAll();
      }
      return;
    }
    case 'caveIn':
      caveIn(g);
      return;
    case 'ackStory':
      s.story.events.shift();
      return;
  }
}
