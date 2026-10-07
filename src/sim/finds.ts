// M10 Finds: the tinker's cart, curios, Pell's dog and the cart's boons. Pure. canon §21, §14
import { CART, CART_FX, CART_OFFERS, CRATE_METAL, CURIO, CURIOS, DOG, type CartOfferId } from '../data/finds';
import { CHEST_LOOT } from '../data/economy';
import { BIOMES, biomeAt } from '../data/biomes';
import type { ResKey } from '../data/resources';
import { D } from './decimal';
import type { Game } from './game';
import { reach } from './reach';
import { hash3, makeRng } from './rng';
import type { GameState } from './state';
import { first, say } from './story';
import { tally } from './tally';

// ---------- the tinker's cart ----------

/** The cart parks once its time comes, and stays until you take something, away or not. */
export function stepCart(g: Game): void {
  const s = g.state;
  if (s.cart.offers || s.t < s.cart.nextAt) return;
  const rng = makeRng(s.rng);
  const pool = CART_OFFERS.filter((o) => offerable(s, o.id));
  const picks: CartOfferId[] = [];
  while (picks.length < CART.offers && pool.length) {
    const total = pool.reduce((a, o) => a + o.weight, 0);
    let r = rng.next() * total;
    const k = pool.findIndex((o) => (r -= o.weight) < 0);
    picks.push(pool.splice(k < 0 ? pool.length - 1 : k, 1)[0]!.id);
  }
  s.rng = rng.state();
  s.cart.offers = picks;
  g.events.push({ kind: 'cart' });
  first(g, 'cart');
  say(g, 'tinker');
}

/** The map is only worth carrying while a verse is still to find this run. */
function offerable(s: GameState, id: CartOfferId): boolean {
  if (id === 'map') return s.verses.run.some((k) => !k);
  return true;
}

/** What an offer gives right now, for the cart's cards and for taking it. */
export function offerValue(s: GameState, id: CartOfferId): { res?: ResKey; n: number; ms?: number } {
  switch (id) {
    case 'crate': {
      const res = CRATE_METAL[biomeAt(s.stats.maxDepthD).id] ?? 'copperBar';
      return { res, n: Math.round(CART_FX.crate.bars * (1 + CART_FX.crate.perCaveIn * s.stats.caveIns)) };
    }
    case 'torches':
      return s.stats.maxDepthD >= BIOMES[2]!.d0
        ? { res: 'lantern', n: Math.ceil(CART_FX.torches / 3) }
        : { res: 'torch', n: CART_FX.torches };
    case 'tonic':
      return { n: CART_FX.tonic.mult, ms: CART_FX.tonic.ms };
    case 'grindstone':
      return { n: CART_FX.grindstone.mult, ms: CART_FX.grindstone.ms };
    case 'map':
      return { n: 1, ms: CART_FX.map.ms };
    case 'echo':
      return { n: CART_FX.echo };
  }
}

/** Take offer i: the cart rolls on, and comes back some minutes later. */
export function takeCart(g: Game, i: number): boolean {
  const s = g.state;
  const id = s.cart.offers?.[i];
  if (!id) return false;
  const v = offerValue(s, id);
  if (v.res) s.res[v.res] = s.res[v.res].add(v.n);
  if (id === 'tonic') s.boosts.miners = s.t + v.ms!;
  if (id === 'grindstone') s.boosts.hands = s.t + v.ms!;
  if (id === 'map') s.boosts.map = s.t + v.ms!;
  if (id === 'echo') {
    s.echoes = s.echoes.add(v.n);
    s.echoesEver = s.echoesEver.add(v.n);
  }
  const rng = makeRng(s.rng);
  s.cart.nextAt = s.t + CART.gapMinMs + Math.floor(rng.next() * (CART.gapMaxMs - CART.gapMinMs));
  s.rng = rng.state();
  s.cart.offers = null;
  g.events.push({ kind: 'bought', what: `cart:${id}` });
  return true;
}

/** The cart's boons: ×2 for miners or hands while one lasts. */
export function boostMult(s: GameState, fx: 'miners' | 'hands'): number {
  if (fx === 'miners') return s.t < s.boosts.miners ? CART_FX.tonic.mult : 1;
  return s.t < s.boosts.hands ? CART_FX.grindstone.mult : 1;
}

// ---------- curios ----------

/** About one tile in CURIO.per gives up a curio of its biome, if the shelf still lacks one. */
export function rollCurio(g: Game, x: number, y: number): void {
  const s = g.state;
  const b = biomeAt(g.world.depth(y)).id;
  if (b < 1) return;
  const k = s.seed + s.cycle * 7919;
  if (hash3(x, y, k + 31) >= 1 / CURIO.per) return;
  const left = CURIOS.filter((c) => c.biome === b && !s.curios.includes(c.id));
  if (!left.length) return;
  const total = left.reduce((a, c) => a + CURIO.weight[c.rarity], 0);
  let r = hash3(x, y, k + 97) * total;
  const c = left.find((c) => (r -= CURIO.weight[c.rarity]) < 0) ?? left[left.length - 1]!;
  s.curios.push(c.id);
  const set = left.length === 1 ? b : undefined;
  g.events.push({ kind: 'curio', id: c.id, x, y, set });
  first(g, 'curio');
  say(g, 'curio');
}

/** Biomes whose four curios are all on the shelf. */
export function fullSets(s: GameState): number[] {
  const out: number[] = [];
  for (let b = 1; b <= 6; b++) {
    const set = CURIOS.filter((c) => c.biome === b);
    if (set.every((c) => s.curios.includes(c.id))) out.push(b);
  }
  return out;
}

/** The shelf's speed for miners or hands: each curio's own, and every full set's. */
export function curioMult(s: GameState, fx: 'miners' | 'hands'): number {
  let k = 1;
  for (const c of CURIOS) if (c.fx === fx && s.curios.includes(c.id)) k += CURIO.bonus[c.rarity];
  return k + CURIO.set * fullSets(s).length;
}

// ---------- chests and Pell's dog ----------

/** Open an old chest: by a tap, or brought up by the dog. */
export function openChest(g: Game, x: number, y: number, by: 'tap' | 'dog' = 'tap'): void {
  const s = g.state;
  const key = String(g.world.idx(x, y));
  if (s.world.objects[key] !== 'chest') return;
  const rng = makeRng(s.rng);
  const loot = CHEST_LOOT[rng.int(0, CHEST_LOOT.length - 1)]!;
  const n = rng.int(loot.lo, loot.hi);
  s.rng = rng.state();
  delete s.world.objects[key];
  s.res[loot.res] = s.res[loot.res].add(D(n));
  s.stats.chests++;
  tally(g, 'chests', n);
  if (by === 'tap') s.story.events.push({ kind: 'chest', res: loot.res, n: String(n) });
  else g.events.push({ kind: 'fetched', x, y, res: loot.res, n });
  g.events.push({ kind: 'chest', x, y });
  g.world.touch(x, y);
  say(g, 'chest');
}

/** The nearest unopened chest the dog can get to: in the dug mine and within DOG.range of the Foreman. */
function nearestChest(g: Game): { x: number; y: number } | null {
  const s = g.state;
  const w = g.world;
  const r = reach(g);
  const f = s.foreman;
  let best: { x: number; y: number; d: number } | null = null;
  for (const [k, o] of Object.entries(s.world.objects)) {
    if (o !== 'chest') continue;
    const i = Number(k);
    const x = i % w.w;
    const y = (i - x) / w.w;
    const d = Math.max(Math.abs(x - f.x), Math.abs(y - f.y));
    if (d > DOG.range || !r[i]) continue;
    if (!best || d < best.d) best = { x, y, d };
  }
  return best && { x: best.x, y: best.y };
}

/** Pell's dog: off to the nearest chest, back with what was in it, a rest by the Foreman, then off again. */
export function stepDog(g: Game, dt: number): void {
  const s = g.state;
  if (!s.helpers.dog) return;
  const f = s.foreman;
  const dog = (g.dog ??= { x: f.x, y: f.y, target: null, rest: 0 });
  const goal = dog.target ?? { x: f.x, y: f.y };
  const dx = goal.x - dog.x;
  const dy = goal.y - dog.y;
  const dist = Math.hypot(dx, dy);
  const stepT = DOG.speed * dt;
  if (dist > stepT) {
    dog.x += (dx / dist) * stepT;
    dog.y += (dy / dist) * stepT;
  } else {
    dog.x = goal.x;
    dog.y = goal.y;
    if (dog.target) {
      openChest(g, dog.target.x, dog.target.y, 'dog');
      dog.target = null;
      dog.rest = DOG.restS;
    }
  }
  if (dog.target) {
    // someone else got there first
    if (s.world.objects[String(g.world.idx(dog.target.x, dog.target.y))] !== 'chest') dog.target = null;
    return;
  }
  dog.rest = Math.max(0, dog.rest - dt);
  if (dog.rest > 0 || (s.t % 1000 !== 0 && dt < 1)) return;
  dog.target = nearestChest(g);
}
