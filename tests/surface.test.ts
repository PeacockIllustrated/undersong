// M6 Holloway above: Tansy's fields, the cookhouse, the feast bell, Rook's woodlot and elder roots. canon §17
import { describe, expect, it } from 'vitest';
import { createGame, syncWorld } from '../src/sim/game';
import { apply } from '../src/sim/actions';
import { step } from '../src/sim/step';
import { resetRun } from '../src/sim/cavein';
import { SHAFT_X, TICK_MS } from '../src/data/constants';
import { ACT_CROPS, FEAST, FIELDS, MEALS, PIT_PROP, ROOTS, TALLY, WOODLOT } from '../src/data/surface';
import { HEAT } from '../src/data/heat';
import { haulRate } from '../src/sim/economy';
import { tally, tallyRates } from '../src/sim/tally';
import { craftCost } from '../src/sim/village';
import { minerMult, villageMult, handsMult } from '../src/sim/power';
import {
  brothCool,
  cellarCost,
  feastNeed,
  feasting,
  growing,
  harvest,
  hotbedCost,
  mealCost,
  paddyCost,
  isElder,
  plotX,
  rootTiles,
  stepSurface,
  treeStage,
} from '../src/sim/surface';
import { Decimal } from '../src/sim/decimal';
import { helperOffered } from '../src/sim/helpers';

function withTansy(seed = 3) {
  const g = createGame(seed);
  g.state.res.copperBar = new Decimal(1000);
  apply(g, { type: 'hireMiner' });
  step(g, TICK_MS);
  return g;
}

const ripen = (g: ReturnType<typeof createGame>) => {
  for (const p of g.state.surface.plots) p.t = 1;
};

describe('Tansy and the fields (M6-02)', () => {
  it('arrives with the first miner and brings one free plot', () => {
    const g = createGame(3);
    step(g, TICK_MS);
    expect(g.state.surface.tansy).toBe(false);
    g.state.res.copperBar = new Decimal(1000);
    apply(g, { type: 'hireMiner' });
    step(g, TICK_MS);
    expect(g.state.surface.tansy).toBe(true);
    expect(g.state.surface.plots).toHaveLength(1);
  });

  it('prices plots on 6 × 1.15ⁿ after the free one', () => {
    const g = withTansy();
    const before = g.state.res.copperBar;
    apply(g, { type: 'buyPlot' });
    expect(before.sub(g.state.res.copperBar).toNumber()).toBe(FIELDS.plotCost.n);
    apply(g, { type: 'buyPlot' });
    expect(g.state.surface.plots).toHaveLength(3);
  });

  it('ripens in 90 s and pays double for a hand harvest', () => {
    const g = withTansy();
    for (let t = 0; t < (FIELDS.ripenS * 1000) / TICK_MS; t++) step(g, TICK_MS);
    const p = g.state.surface.plots[0]!;
    expect(p.t).toBe(1);
    p.golden = false;
    apply(g, { type: 'harvest', plot: 0 });
    expect(g.state.res.barley.toNumber()).toBe(FIELDS.yield * FIELDS.handMult);
    expect(p.t).toBe(0);
    p.t = 1;
    harvest(g, 0, false);
    expect(g.state.res.barley.toNumber()).toBe(FIELDS.yield * (FIELDS.handMult + 1));
  });

  it('a tap on a ripe plot above the grass reaps it', () => {
    const g = withTansy();
    ripen(g);
    g.state.surface.plots[0]!.golden = false;
    const x = plotX(0);
    apply(g, { type: 'tap', x, y: g.world.surf[x]! - 1, tool: 'dig' });
    expect(g.state.res.barley.toNumber()).toBe(FIELDS.yield * FIELDS.handMult);
  });

  it('rolls golden ears from the seeded RNG, the same every time', () => {
    const roll = () => {
      const g = withTansy(11);
      for (let i = 0; i < FIELDS.maxPlots - 1; i++) apply(g, { type: 'buyPlot' });
      let golden = 0;
      for (let k = 0; k < 40; k++) {
        for (const p of g.state.surface.plots) p.t = 0.999999;
        stepSurface(g, 1);
        golden += g.state.surface.plots.filter((p) => p.golden).length;
        for (let i = 0; i < g.state.surface.plots.length; i++) harvest(g, i, false);
      }
      return golden;
    };
    const a = roll();
    expect(a).toBe(roll());
    // 480 ears at 1 in 25: about 19
    expect(a).toBeGreaterThan(5);
    expect(a).toBeLessThan(40);
  });

  it("Tansy's hands is offered after the 5th harvest and reaps on its own", () => {
    const g = withTansy();
    for (let i = 0; i < FIELDS.handsAfter - 1; i++) {
      ripen(g);
      harvest(g, 0, true);
    }
    expect(helperOffered(g.state, 'tansy')).toBe(false);
    ripen(g);
    harvest(g, 0, true);
    expect(helperOffered(g.state, 'tansy')).toBe(true);
    apply(g, { type: 'hireHelper', id: 'tansy' });
    expect(g.state.helpers.tansy).toBe(1);
    ripen(g);
    const before = g.state.res.barley.toNumber();
    for (let t = 0; t < 3000; t += TICK_MS) step(g, TICK_MS);
    expect(g.state.res.barley.toNumber()).toBeGreaterThan(before);
  });
});

describe('the cookhouse and the feast bell (M6-03)', () => {
  it('bread speeds miners and porridge the foreman; both reset on a Cave-in', () => {
    const g = withTansy();
    g.state.res.barley = new Decimal(1000);
    const m0 = minerMult(g.state);
    const h0 = handsMult(g.state);
    apply(g, { type: 'eatMeal', id: 'bread' });
    apply(g, { type: 'eatMeal', id: 'porridge' });
    const bread = MEALS.find((m) => m.id === 'bread')!;
    const porridge = MEALS.find((m) => m.id === 'porridge')!;
    expect(minerMult(g.state) / m0).toBeCloseTo(1 + bread.per);
    expect(handsMult(g.state) / h0).toBeCloseTo(1 + porridge.per);
    expect(g.state.res.barley.toNumber()).toBe(1000 - bread.base - porridge.base);
    resetRun(g.state);
    expect(g.state.surface.meals).toEqual({ bread: 0, porridge: 0, soup: 0, broth: 0 });
  });

  it('the bell fills from harvests, doubles every worker for 45 s, and asks more next time', () => {
    const g = withTansy();
    const v0 = villageMult(g.state);
    g.state.surface.feast = feastNeed(g.state) - 1;
    apply(g, { type: 'ringFeast' });
    expect(feasting(g.state)).toBe(false);
    ripen(g);
    g.state.surface.plots[0]!.golden = false;
    harvest(g, 0, true);
    apply(g, { type: 'ringFeast' });
    expect(feasting(g.state)).toBe(true);
    expect(villageMult(g.state) / v0).toBeCloseTo(FEAST.mult);
    expect(feastNeed(g.state)).toBe(Math.ceil(FEAST.need * FEAST.growth));
    // crops grow ×3 while it lasts
    g.state.surface.plots[0]!.t = 0;
    stepSurface(g, FIELDS.ripenS / FEAST.grow / 2);
    expect(g.state.surface.plots[0]!.t).toBeCloseTo(0.5);
    for (let t = 0; t < FEAST.seconds * 1000; t += TICK_MS) step(g, TICK_MS);
    expect(feasting(g.state)).toBe(false);
  });

  it('a golden ear counts 10 toward the bell', () => {
    const g = withTansy();
    ripen(g);
    g.state.surface.plots[0]!.golden = true;
    harvest(g, 0, false);
    expect(g.state.surface.feast).toBe(FEAST.golden);
    expect(g.state.res.barley.toNumber()).toBe(FIELDS.yield * FIELDS.goldenMult);
  });
});

describe("Rook's woodlot (M6-04)", () => {
  function withRook() {
    const g = withTansy();
    g.state.stats.maxDepthD = WOODLOT.unlockD;
    step(g, TICK_MS);
    return g;
  }

  it('arrives at the Kiln depth and plants two saplings', () => {
    const g = withRook();
    expect(g.state.surface.rook).toBe(true);
    expect(g.state.surface.trees).toHaveLength(WOODLOT.freeSaplings);
  });

  it('trees grow through four stages and fell for 0, 4, 12, 40 timber, double by hand', () => {
    const g = withRook();
    const t = g.state.surface.trees[0]!;
    expect(treeStage(t)).toBe(0);
    apply(g, { type: 'chop', tree: 0 });
    expect(g.state.res.timber.toNumber()).toBe(0);
    t.age = WOODLOT.stageS[2]!;
    expect(treeStage(t)).toBe(3);
    apply(g, { type: 'chop', tree: 0 });
    expect(g.state.res.timber.toNumber()).toBe(WOODLOT.chop[3]! * WOODLOT.handMult);
    expect(t.age).toBe(0);
  });

  it('timber buys the hearth, cottages and pit props', () => {
    const g = withRook();
    g.state.res.timber = new Decimal(1000);
    const v0 = minerMult(g.state);
    apply(g, { type: 'buyWood', id: 'cottage' });
    expect(minerMult(g.state) / v0).toBeCloseTo(1.02);
    apply(g, { type: 'buyWood', id: 'hearth' });
    expect(g.state.surface.wood.hearth).toBe(1);
    g.state.res.brick = new Decimal(0);
    expect(craftCost(g.state, 'support')).toEqual([{ res: 'timber', amount: new Decimal(PIT_PROP.n) }]);
  });

  it("Rook's axe fells old trees but leaves ones that stood through a Cave-in", () => {
    const g = withRook();
    g.state.surface.chopsEver = 1;
    g.state.res.copperBar = new Decimal(1000);
    apply(g, { type: 'hireHelper', id: 'rook' });
    expect(g.state.helpers.rook).toBe(1);
    const [a, b] = g.state.surface.trees;
    a!.age = b!.age = WOODLOT.stageS[2]!;
    b!.stood = 1;
    for (let t = 0; t < 2000; t += TICK_MS) step(g, TICK_MS);
    expect(a!.age).toBeLessThan(5);
    expect(b!.age).toBeGreaterThan(WOODLOT.stageS[2]!);
  });
});

describe('trees through the Cave-in (M6-05)', () => {
  it('trees stand through a Cave-in and become elders after 3, giving timber', () => {
    const g = createGame(5);
    g.state.surface.trees = [{ slot: 2, age: 100, stood: 0 }];
    for (let i = 0; i < WOODLOT.elderAfter; i++) resetRun(g.state);
    const t = g.state.surface.trees[0]!;
    expect(t.stood).toBe(WOODLOT.elderAfter);
    expect(isElder(t)).toBe(true);
    // Rook comes straight back to a woodlot with trees in it
    step(g, TICK_MS);
    expect(g.state.surface.rook).toBe(true);
    const before = g.state.res.timber.toNumber();
    for (let k = 0; k < 600; k++) step(g, TICK_MS);
    expect(g.state.res.timber.toNumber() - before).toBeCloseTo(WOODLOT.elderTimberPerMin, 0);
    apply(g, { type: 'chop', tree: 0 });
    expect(t.stood).toBe(WOODLOT.elderAfter);
  });

  it("an elder's roots grow 6 rows a Cave-in and soften the rock", () => {
    const g = createGame(5);
    g.state.surface.trees = [{ slot: 2, age: 0, stood: WOODLOT.elderAfter }];
    const roots = rootTiles(g.state, g.world);
    expect(roots).toHaveLength(ROOTS.rowsPerCaveIn);
    g.state.surface.trees[0]!.stood++;
    expect(rootTiles(g.state, g.world)).toHaveLength(ROOTS.rowsPerCaveIn * 2);
    const i = roots[3]!;
    const x = i % g.world.w;
    const y = Math.floor(i / g.world.w);
    const hard = g.world.hardnessOf(x, y);
    syncWorld(g.state, g.world);
    expect(g.world.hardnessOf(x, y)).toBeCloseTo(hard * ROOTS.soften);
  });
});

describe('surface in coarse offline steps', () => {
  it('Tansy and the elders keep working at 5 s a step', () => {
    const g = withTansy();
    g.state.helpers.tansy = 1;
    g.state.surface.trees = [{ slot: 0, age: 0, stood: WOODLOT.elderAfter }];
    for (let t = 0; t < 600_000; t += 5000) step(g, 5000);
    expect(g.state.surface.harvestsEver).toBeGreaterThan(4);
    expect(g.state.res.timber.toNumber()).toBeGreaterThan(15);
  });
});

describe('The tally board (M6-06)', () => {
  it('counts each source per second, rolls its window, and starts over after a Cave-in', () => {
    const g = withTansy();
    expect(tallyRates(g)).toBeNull();
    ripen(g);
    harvest(g, 0, true);
    g.state.t += 10_000;
    const r = tallyRates(g)!;
    expect(r.fields).toBeGreaterThan(0);
    expect(r.miners).toBe(0);
    // a whole window later the count still shows, then fades out the window after
    g.state.t += TALLY.windowS * 1000;
    tally(g, 'chests', 0);
    expect(tallyRates(g)!.fields).toBeGreaterThan(0);
    g.state.t += TALLY.windowS * 1000;
    expect(tallyRates(g)!.fields).toBe(0);
    g.state.t = 0;
    expect(tallyRates(g)).toBeNull();
  });
});

describe('Act crops (M6-07)', () => {
  it('digs and seeds the root cellar once the Lamp-works stands, then gives a spore every few seconds', () => {
    const g = withTansy();
    const s = g.state;
    expect(cellarCost(s)).toBeNull();
    s.buildings.lampworks = 1;
    s.res.ironBar = new Decimal(10);
    s.res.brick = new Decimal(10);
    s.res.spores = new Decimal(ACT_CROPS.cellarSeed.n);
    apply(g, { type: 'workCellar' });
    apply(g, { type: 'workCellar' });
    expect(s.surface.cellar).toBe(2);
    expect(s.res.spores.toNumber()).toBe(0);
    stepSurface(g, ACT_CROPS.cellarEveryS * 3);
    expect(s.res.spores.toNumber()).toBe(3);
    expect(cellarCost(s)).toBeNull();
  });

  it('floods paddies only as far as the pumps can water them, and dry paddies do not grow', () => {
    const g = withTansy();
    const s = g.state;
    s.res.silverBar = new Decimal(1000);
    s.surface.plots.push({ t: 0, golden: false }, { t: 0, golden: false }, { t: 0, golden: false });
    expect(paddyCost(s)).toBeNull();
    s.world.objects[String(g.world.idx(SHAFT_X, 30))] = 'pump';
    apply(g, { type: 'plantCrop', crop: 'cress' });
    apply(g, { type: 'plantCrop', crop: 'cress' });
    apply(g, { type: 'plantCrop', crop: 'cress' });
    expect(s.surface.plots.filter((p) => p.crop === 'cress').length).toBe(ACT_CROPS.paddiesPerPump);
    stepSurface(g, FIELDS.ripenS);
    const i = s.surface.plots.findIndex((p) => p.crop === 'cress');
    expect(s.surface.plots[i]!.t).toBe(1);
    harvest(g, i, false);
    expect(s.res.cress.toNumber()).toBe(FIELDS.yield);
    // take the pump away: the paddies stand dry
    delete s.world.objects[String(g.world.idx(SHAFT_X, 30))];
    stepSurface(g, FIELDS.ripenS);
    expect(s.surface.plots[i]!.t).toBe(0);
    expect(growing(s, i)).toBe(false);
  });

  it('cress soup raises the haul and pepper broth lets miners work hotter faces', () => {
    const g = withTansy();
    const s = g.state;
    const before = haulRate(g);
    s.surface.meals.soup = 2;
    expect(haulRate(g) / before).toBeCloseTo(1 + 2 * MEALS.find((m) => m.id === 'soup')!.per);
    s.surface.meals.broth = 3;
    expect(brothCool(s)).toBeCloseTo(0.3);
    s.res.cress = new Decimal(1000);
    s.surface.meals.soup = 3;
    expect(mealCost(s, 'soup')).toBeNull();
  });

  it('hot-beds come in the Ember Deep and burn one ember ore a harvest; with none they go cold', () => {
    const g = withTansy();
    const s = g.state;
    s.res.goldBar = new Decimal(100);
    expect(hotbedCost(s)).toBeNull();
    s.stats.maxDepthD = HEAT.fromD;
    apply(g, { type: 'plantCrop', crop: 'pepper' });
    expect(s.surface.plots[0]!.crop).toBe('pepper');
    stepSurface(g, FIELDS.ripenS);
    expect(s.surface.plots[0]!.t).toBe(0);
    s.res.emberOre = new Decimal(1);
    stepSurface(g, FIELDS.ripenS);
    harvest(g, 0, true);
    expect(s.res.pepper.toNumber()).toBe(FIELDS.yield * FIELDS.handMult);
    expect(s.res.emberOre.toNumber()).toBe(0);
    expect(s.surface.plots[0]!.golden).toBe(false);
  });

  it('the Cave-in forgets the cellar and the soup', () => {
    const g = withTansy();
    g.state.surface.cellar = 2;
    g.state.surface.meals.broth = 2;
    resetRun(g.state);
    expect(g.state.surface.cellar).toBe(0);
    expect(g.state.surface.meals.broth).toBe(0);
  });
});
