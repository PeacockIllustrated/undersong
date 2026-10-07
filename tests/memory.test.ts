// M9: the bunkhouse remembers, racing the last run, the Foreman's lead, the deep metals' buys and the Cave-in song.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/game';
import { apply } from '../src/sim/actions';
import { step } from '../src/sim/step';
import { D } from '../src/sim/decimal';
import { caveIn } from '../src/sim/cavein';
import { aheadOfLast, ghostDepth } from '../src/sim/memory';
import { ledByForeman, minerRate } from '../src/sim/miners';
import { metalworkCost } from '../src/sim/economy';
import { handsMult, minerMult } from '../src/sim/power';
import { GHOST, LEAD, REHIRE_EVERY_MS } from '../src/data/memory';
import { CAVE_IN, METALWORK } from '../src/data/economy';
import { TICK_MS } from '../src/data/constants';

const run = (g: ReturnType<typeof createGame>, ms: number): void => {
  for (let t = 0; t < ms; t += TICK_MS) step(g, TICK_MS);
};

/** A game ready to cave in: a run long and deep enough. */
function readyToCave(g: ReturnType<typeof createGame>): void {
  g.state.stats.maxDepthD = 80;
  g.state.stats.bestDepthD = 80;
  g.state.verses.run[CAVE_IN.verse] = true;
  g.state.verses.known[CAVE_IN.verse] = true;
}

describe('the run keeps its depth by minute', () => {
  it('records the deepest depth for each minute, capped', () => {
    const g = createGame(3);
    run(g, 60_000 * 2 + TICK_MS);
    expect(g.state.runDepth.length).toBe(3);
    g.state.stats.maxDepthD = 42;
    run(g, 60_000);
    expect(g.state.runDepth[3]).toBe(42);
    expect(g.state.runDepth.length).toBeLessThanOrEqual(GHOST.capMin);
  });
  it('hands it to the next run on a Cave-in, with the miner count', () => {
    const g = createGame(4);
    g.state.res.copperBar = D(500);
    for (let i = 0; i < 3; i++) apply(g, { type: 'hireMiner' });
    run(g, 60_000);
    readyToCave(g);
    expect(caveIn(g)).toBe(true);
    expect(g.state.lastRun.miners).toBe(3);
    expect(g.state.lastRun.depthByMin.length).toBeGreaterThan(0);
    expect(g.state.runDepth).toEqual([]);
  });
});

describe('Bunkhouse Roll (M9-03)', () => {
  it('rehires last run’s miners as bars come in, and no more', () => {
    const g = createGame(5);
    g.state.upgrades.bunkhouseRoll = 1;
    g.state.lastRun = { miners: 2, depthByMin: [] };
    g.state.res.copperBar = D(1000);
    run(g, REHIRE_EVERY_MS * 4);
    expect(g.state.miners.length).toBe(2);
  });
  it('does nothing without the upgrade', () => {
    const g = createGame(5);
    g.state.lastRun = { miners: 2, depthByMin: [] };
    g.state.res.copperBar = D(1000);
    run(g, REHIRE_EVERY_MS * 4);
    expect(g.state.miners.length).toBe(0);
  });
});

describe('racing the last run (M9-05)', () => {
  it('says how far ahead, and toasts once on passing', () => {
    const g = createGame(6);
    g.state.cycle = 2;
    g.state.lastRun = { miners: 0, depthByMin: [0, 5, 10, 20, 40] };
    expect(ghostDepth(g.state)).toBe(0);
    g.state.stats.maxDepthD = 20;
    expect(aheadOfLast(g.state)).toBe(3);
    step(g, TICK_MS);
    expect(g.events.filter((e) => e.kind === 'ahead')).toHaveLength(1);
    g.events.length = 0;
    step(g, TICK_MS);
    expect(g.events.filter((e) => e.kind === 'ahead')).toHaveLength(0);
  });
  it('has no ghost in the first cycle', () => {
    const g = createGame(6);
    expect(ghostDepth(g.state)).toBeNull();
    expect(aheadOfLast(g.state)).toBeNull();
  });
});

describe('lead from the front (M9-06)', () => {
  it('speeds miners near the Foreman by LEAD.mult', () => {
    const g = createGame(7);
    g.state.res.copperBar = D(100);
    apply(g, { type: 'hireMiner' });
    run(g, 2000);
    const m = g.state.miners[0]!;
    expect(m.target).not.toBeNull();
    g.state.foreman.x = m.x;
    g.state.foreman.y = m.y;
    expect(ledByForeman(g, m)).toBe(true);
    const near = minerRate(g, m);
    g.state.foreman.x = m.x + LEAD.radius + 1;
    expect(ledByForeman(g, m)).toBe(false);
    expect(near / minerRate(g, m)).toBeCloseTo(LEAD.mult);
  });
});

describe('the deep metals’ buys (M9-02)', () => {
  it('cost more each level, speed their workers, and reset on a Cave-in', () => {
    const g = createGame(8);
    const m = METALWORK.find((x) => x.fx === 'miners')!;
    g.state.res[m.res] = D(1000);
    const before = minerMult(g.state);
    const c0 = metalworkCost(g.state, m.id)[0]!.amount;
    apply(g, { type: 'metalwork', id: m.id });
    expect(g.state.metalwork[m.id]).toBe(1);
    expect(metalworkCost(g.state, m.id)[0]!.amount.gt(c0)).toBe(true);
    expect(minerMult(g.state) / before).toBeCloseTo(1 + m.per);
    const h = METALWORK.find((x) => x.fx === 'hands')!;
    g.state.res[h.res] = D(1000);
    const hb = handsMult(g.state);
    apply(g, { type: 'metalwork', id: h.id });
    expect(handsMult(g.state) / hb).toBeCloseTo(1 + h.per);
    readyToCave(g);
    caveIn(g);
    expect(g.state.metalwork).toEqual({});
  });
  it('is not offered before the run has any of that metal', () => {
    const g = createGame(8);
    apply(g, { type: 'metalwork', id: 'gilded' });
    expect(g.state.metalwork.gilded).toBeUndefined();
  });
});

describe('the Cave-in song (M9-04)', () => {
  it('carries this run’s verses on the event, for the ceremony', () => {
    const g = createGame(9);
    readyToCave(g);
    g.state.verses.run[2] = true; // Verse II is the Cave-in's own (index 1)
    caveIn(g);
    const e = g.events.find((x) => x.kind === 'caveIn');
    expect(e && e.kind === 'caveIn' && e.verses).toEqual([CAVE_IN.verse, 2]);
  });
});
