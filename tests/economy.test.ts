import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/game';
import { apply } from '../src/sim/actions';
import { step } from '../src/sim/step';
import { D } from '../src/sim/decimal';
import { haulRate, minerCost, shaftDepth } from '../src/sim/economy';
import { canCaveIn, echoGain } from '../src/sim/cavein';
import { rushMult } from '../src/sim/dig';
import { mineTile } from '../src/sim/dig';
import { M } from '../src/data/materials';
import { TICK_MS } from '../src/data/constants';

const run = (g: ReturnType<typeof createGame>, secs: number): void => {
  for (let i = 0; i < (secs * 1000) / TICK_MS; i++) step(g, TICK_MS);
};

describe('forge', () => {
  it('turns 5 ore into a bar every 2 s', () => {
    const g = createGame(1);
    g.state.res.copperOre = D(10);
    run(g, 2);
    expect(g.state.res.copperBar.toNumber()).toBe(1);
    run(g, 2);
    expect(g.state.res.copperBar.toNumber()).toBe(2);
    expect(g.state.res.copperOre.toNumber()).toBe(0);
  });
  it('makes bronze from 2 copper bars and 1 tin bar', () => {
    const g = createGame(1);
    g.state.res.copperBar = D(4);
    g.state.res.tinBar = D(1);
    apply(g, { type: 'setRecipe', recipe: 'bronze' });
    run(g, 4.1);
    expect(g.state.res.bronzeBar.toNumber()).toBe(1);
    expect(g.state.res.copperBar.toNumber()).toBe(2);
  });
});

describe('village', () => {
  it('miner cost grows by 1.15 per miner (canon §4.1)', () => {
    const g = createGame(1);
    g.state.res.copperBar = D(1000);
    expect(minerCost(g.state).amount.toNumber()).toBe(15);
    apply(g, { type: 'hireMiner' });
    expect(minerCost(g.state).amount.toNumber()).toBe(Math.ceil(15 * 1.15));
    expect(g.state.miners).toHaveLength(1);
  });
  it('miners dig and their ore is hauled up at the canon §4.9 rate', () => {
    const g = createGame(5);
    g.state.res.copperBar = D(15);
    apply(g, { type: 'hireMiner' });
    run(g, 120);
    expect(g.state.stats.tilesMined).toBeGreaterThan(0);
    expect(haulRate(g)).toBeCloseTo((1 * 5) / shaftDepth(g));
  });
  it('buys picks in order', () => {
    const g = createGame(1);
    g.state.res.copperBar = D(10);
    g.state.res.bronzeBar = D(25);
    apply(g, { type: 'buyPick' });
    apply(g, { type: 'buyPick' });
    expect(g.state.pickTier).toBe(2);
  });
});

describe('vein rush', () => {
  it('caps at x5', () => {
    expect(rushMult(0)).toBe(1);
    expect(rushMult(4)).toBe(2);
    expect(rushMult(100)).toBe(5);
  });
});

describe('verses and the Cave-in', () => {
  it('finds a verse when the rock beside its carving is opened', () => {
    const g = createGame(9);
    const c = g.world.carvings[0]!;
    mineTile(g, c.x + 1, c.y, 'foreman');
    expect(g.state.verses.run[0]).toBe(true);
    expect(g.state.story.events.some((e) => e.kind === 'verse' && e.verse === 0)).toBe(true);
  });
  it('unlocks at 300 ft with Verse II, pays canon §4.3 Echoes and resets the run', () => {
    const g = createGame(9);
    g.state.stats.maxDepthD = 75;
    expect(canCaveIn(g.state)).toBe(false);
    g.state.verses.run[0] = true;
    g.state.verses.run[1] = true;
    g.state.verses.known[1] = true;
    expect(canCaveIn(g.state)).toBe(true);
    expect(echoGain(g.state).toNumber()).toBe(Math.floor(Math.sqrt(30) * 1.5));
    g.state.res.copperBar = D(50);
    const seed = g.state.seed;
    apply(g, { type: 'caveIn' });
    expect(g.state.echoes.toNumber()).toBe(8);
    expect(g.state.cycle).toBe(2);
    expect(g.state.seed).not.toBe(seed);
    expect(g.state.res.copperBar.toNumber()).toBe(0);
    expect(g.state.verses.known[1]).toBe(true);
    expect(g.state.verses.run[1]).toBe(false);
    expect(g.state.survey.at(-1)?.hand).toBe('yours');
    expect(g.world.get(40, 15)).toBe(M.AIR);
  });
  it('Remembered Rope starts the next run with the winch', () => {
    const g = createGame(9);
    g.state.echoes = D(5);
    // Pell's Hum comes first in the Memory branch (ADR-020)
    apply(g, { type: 'buyUpgrade', id: 'pellsHum' });
    apply(g, { type: 'buyUpgrade', id: 'rememberedRope' });
    g.state.stats.maxDepthD = 80;
    g.state.verses.run[1] = true;
    apply(g, { type: 'caveIn' });
    expect(g.state.haulTier).toBe(1);
  });
});
