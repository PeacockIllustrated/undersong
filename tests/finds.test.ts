// M10 Finds: the tinker's cart, the curio shelf, Pell's dog, and rain over the fields.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/game';
import { apply } from '../src/sim/actions';
import { step } from '../src/sim/step';
import { D } from '../src/sim/decimal';
import { caveIn } from '../src/sim/cavein';
import { curioMult, fullSets, offerValue, rollCurio, stepDog } from '../src/sim/finds';
import { handsMult, minerMult } from '../src/sim/power';
import { raining } from '../src/sim/surface';
import { CART, CART_FX, CURIO, CURIOS, RAIN } from '../src/data/finds';
import { CAVE_IN } from '../src/data/economy';
import { SHAFT_X, SKY_ROWS, TICK_MS } from '../src/data/constants';
import { reach } from '../src/sim/reach';
import { M } from '../src/data/materials';
import { BIOMES } from '../src/data/biomes';

type G = ReturnType<typeof createGame>;
const run = (g: G, ms: number): void => {
  for (let t = 0; t < ms; t += TICK_MS) step(g, TICK_MS);
};
/** Skip ahead in run time without stepping everything in between. */
const jump = (g: G, ms: number): void => {
  g.state.t += ms - TICK_MS;
  step(g, TICK_MS);
};

describe('the tinker’s cart (M10-01)', () => {
  it('parks with three different offers once its time comes', () => {
    const g = createGame(11);
    jump(g, CART.firstMs - 1000);
    expect(g.state.cart.offers).toBeNull();
    jump(g, 1000);
    const o = g.state.cart.offers!;
    expect(o).toHaveLength(CART.offers);
    expect(new Set(o).size).toBe(CART.offers);
    expect(g.events.some((e) => e.kind === 'cart')).toBe(true);
  });

  it('waits while you are away, and comes back 6 to 10 minutes after you take one', () => {
    const g = createGame(12);
    jump(g, CART.firstMs);
    const offers = g.state.cart.offers!;
    g.offline = true;
    jump(g, 30 * 60_000);
    g.offline = false;
    expect(g.state.cart.offers).toEqual(offers);
    const t = g.state.t;
    apply(g, { type: 'cart', i: 0 });
    expect(g.state.cart.offers).toBeNull();
    expect(g.state.cart.nextAt).toBeGreaterThanOrEqual(t + CART.gapMinMs);
    expect(g.state.cart.nextAt).toBeLessThanOrEqual(t + CART.gapMaxMs);
  });

  it('pays out what each offer says', () => {
    const g = createGame(13);
    const s = g.state;
    s.cart.offers = ['crate', 'tonic', 'echo'];
    const crate = offerValue(s, 'crate');
    apply(g, { type: 'cart', i: 0 });
    expect(s.res[crate.res!].toNumber()).toBe(crate.n);
    s.cart.offers = ['crate', 'tonic', 'echo'];
    const before = minerMult(s);
    apply(g, { type: 'cart', i: 1 });
    expect(minerMult(s)).toBeCloseTo(before * CART_FX.tonic.mult);
    s.t += CART_FX.tonic.ms;
    expect(minerMult(s)).toBeCloseTo(before);
    s.cart.offers = ['crate', 'tonic', 'echo'];
    apply(g, { type: 'cart', i: 2 });
    expect(s.echoes.toNumber()).toBe(CART_FX.echo);
  });

  it('leaves with the rest of the village on a Cave-in', () => {
    const g = createGame(14);
    jump(g, CART.firstMs);
    g.state.stats.maxDepthD = g.state.stats.bestDepthD = 80;
    g.state.verses.run[CAVE_IN.verse] = g.state.verses.known[CAVE_IN.verse] = true;
    expect(caveIn(g)).toBe(true);
    expect(g.state.cart.offers).toBeNull();
    expect(g.state.cart.nextAt).toBe(CART.firstMs);
  });
});

describe('the curio shelf (M10-02)', () => {
  it('turns up about one tile in CURIO.per, and only curios of that biome', () => {
    const g = createGame(21);
    const topsoil = BIOMES[1]!;
    let hits = 0;
    const n = 20_000;
    for (let i = 0; i < n; i++) {
      g.state.curios = [];
      const x = 1 + (i % 70);
      const y = SKY_ROWS + topsoil.d0 + 1 + (Math.floor(i / 70) % 30);
      rollCurio(g, x, y);
      if (g.state.curios.length > 0) hits++;
    }
    expect(hits / n).toBeGreaterThan(0.5 / CURIO.per);
    expect(hits / n).toBeLessThan(2 / CURIO.per);
    const g2 = createGame(22);
    for (let i = 0; i < 200_000 && g2.state.curios.length < 4; i++)
      rollCurio(g2, 1 + (i % 70), SKY_ROWS + 1 + (Math.floor(i / 70) % 36));
    expect(g2.state.curios.length).toBe(4);
    for (const id of g2.state.curios) expect(CURIOS.find((c) => c.id === id)!.biome).toBe(1);
    expect(fullSets(g2.state)).toEqual([1]);
  });

  it('speeds the village, more for a full set, and stays through a Cave-in', () => {
    const g = createGame(23);
    const s = g.state;
    const m0 = minerMult(s);
    const h0 = handsMult(s);
    s.curios = CURIOS.filter((c) => c.biome === 1).map((c) => c.id);
    const set = CURIOS.filter((c) => c.biome === 1);
    const mines =
      1 + set.filter((c) => c.fx === 'miners').reduce((a, c) => a + CURIO.bonus[c.rarity], 0) + CURIO.set;
    expect(curioMult(s, 'miners')).toBeCloseTo(mines);
    expect(minerMult(s)).toBeCloseTo(m0 * mines);
    expect(handsMult(s)).toBeGreaterThan(h0);
    s.stats.maxDepthD = s.stats.bestDepthD = 80;
    s.verses.run[CAVE_IN.verse] = s.verses.known[CAVE_IN.verse] = true;
    expect(caveIn(g)).toBe(true);
    expect(g.state.curios).toHaveLength(4);
  });
});

describe('Pell’s dog (M10-03)', () => {
  it('fetches a chest near the Foreman once hired', () => {
    const g = createGame(31);
    const s = g.state;
    // open a short tunnel down the shaft and put a chest at the bottom
    const y = SKY_ROWS + 3;
    for (let d = 0; d <= 3; d++) g.world.set(SHAFT_X, SKY_ROWS + d, M.AIR);
    reach(g);
    const key = String(g.world.idx(SHAFT_X, y));
    s.world.objects[key] = 'chest';
    run(g, 5000);
    expect(s.world.objects[key]).toBe('chest');
    s.helpers.dog = 1;
    for (let i = 0; i < 100 && s.world.objects[key]; i++) step(g, TICK_MS * 10);
    expect(s.world.objects[key]).toBeUndefined();
    expect(s.stats.chests).toBe(1);
    expect(g.dog).toBeDefined();
    stepDog(g, 1);
  });

  it('is offered once a chest has been opened in any run', async () => {
    const { helperOffered } = await import('../src/sim/helpers');
    const g = createGame(32);
    expect(helperOffered(g.state, 'dog')).toBe(false);
    g.state.story.ever.push('chest');
    expect(helperOffered(g.state, 'dog')).toBe(true);
    g.state.res.copperBar = D(100);
    apply(g, { type: 'hireHelper', id: 'dog' });
    expect(g.state.helpers.dog).toBe(1);
  });
});

describe('rain (M10-04)', () => {
  it('falls now and then once Tansy is here, and makes crops grow faster', () => {
    const g = createGame(41);
    const s = g.state;
    s.surface.tansy = true;
    s.surface.plots = [{ t: 0, golden: false }];
    jump(g, RAIN.firstMs);
    expect(raining(s)).toBe(true);
    const t0 = s.surface.plots[0]!.t;
    run(g, 1000);
    const wet = s.surface.plots[0]!.t - t0;
    s.t = s.surface.rainUntil;
    const t1 = s.surface.plots[0]!.t;
    run(g, 1000);
    const dry = s.surface.plots[0]!.t - t1;
    expect(wet / dry).toBeCloseTo(RAIN.grow, 1);
    expect(s.surface.rainNext - s.surface.rainUntil).toBeGreaterThanOrEqual(RAIN.gapMinMs);
  });

  it('waits for you while you are away', () => {
    const g = createGame(42);
    g.state.surface.tansy = true;
    g.offline = true;
    jump(g, RAIN.firstMs + 60_000);
    expect(raining(g.state)).toBe(false);
    g.offline = false;
    step(g, TICK_MS);
    expect(raining(g.state)).toBe(true);
  });
});

describe('the aquamarine crate (M12-05)', () => {
  it('rides on every cart while the silver pick waits on aquamarine, and pays in it', async () => {
    const { needsAqua } = await import('../src/sim/finds');
    const { AQUA_CRATE } = await import('../src/data/finds');
    const { PICKS } = await import('../src/data/items');
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const g = createGame(seed);
      const s = g.state;
      s.pickTier = AQUA_CRATE.pickTier;
      s.stats.maxDepthD = BIOMES[3]!.d0 + 10;
      expect(needsAqua(s)).toBe(true);
      jump(g, CART.firstMs);
      const i = s.cart.offers!.indexOf('crate');
      expect(i).toBeGreaterThanOrEqual(0);
      expect(offerValue(s, 'crate').res).toBe('aquamarine');
      apply(g, { type: 'cart', i });
      expect(s.res.aquamarine.toNumber()).toBe(CART_FX.crate.bars);
    }
    // once the aquamarine is in hand, the crate is bars again
    const g = createGame(9);
    g.state.pickTier = AQUA_CRATE.pickTier;
    g.state.res.aquamarine = D(PICKS[AQUA_CRATE.pickTier + 1]!.cost[0]!.n);
    expect(needsAqua(g.state)).toBe(false);
    expect(offerValue(g.state, 'crate').res).not.toBe('aquamarine');
  });
});
