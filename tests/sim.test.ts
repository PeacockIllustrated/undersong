import { describe, expect, it } from 'vitest';
import { createGame, loadGame } from '../src/sim/game';
import { apply } from '../src/sim/actions';
import { step } from '../src/sim/step';
import { handMineSeconds } from '../src/sim/formulas';
import { M } from '../src/data/materials';
import { SHAFT_X, SKY_ROWS, TICK_MS } from '../src/data/constants';
import { exportString, fromJSON, importString, toJSON } from '../src/save/codec';
import { readFileSync } from 'node:fs';
import { Decimal } from '../src/sim/decimal';
import { SAVE_VERSION } from '../src/sim/state';

/** First solid tile below the pre-dug shaft collar. */
function shaftFloor(g: ReturnType<typeof createGame>): number {
  let y = SKY_ROWS;
  while (g.world.isAir(SHAFT_X, y)) y++;
  return y;
}

describe('foreman digging', () => {
  it('mines an exposed tile after the canon §4.6 time', () => {
    const g = createGame(42);
    const y = shaftFloor(g);
    const m = g.world.get(SHAFT_X, y);
    const secs = handMineSeconds(g.world.hardnessOf(SHAFT_X, y), g.world.depth(y), 1);
    apply(g, { type: 'dig', x: SHAFT_X, y });
    const ticks = Math.ceil((secs * 1000) / TICK_MS);
    for (let i = 0; i < ticks - 1; i++) step(g, TICK_MS);
    expect(g.world.get(SHAFT_X, y)).toBe(m);
    step(g, TICK_MS);
    expect(g.world.get(SHAFT_X, y)).toBe(M.AIR);
    expect(g.state.world.diffs[String(g.world.idx(SHAFT_X, y))]).toBe(M.AIR);
  });

  it('refuses tiles that do not touch air', () => {
    const g = createGame(42);
    apply(g, { type: 'dig', x: 20, y: SKY_ROWS + 30 });
    expect(g.state.foreman.queue).toHaveLength(0);
    expect(g.events.some((e) => e.kind === 'refused')).toBe(true);
  });

  it('digs a dragged path in order', () => {
    const g = createGame(7);
    const y = shaftFloor(g);
    apply(g, {
      type: 'digPath',
      tiles: [0, 1, 2].map((i) => ({ x: SHAFT_X, y: y + i })),
    });
    for (let i = 0; i < 2000 && g.state.foreman.queue.length + (g.state.foreman.target ? 1 : 0) > 0; i++)
      step(g, TICK_MS);
    for (let i = 0; i < 3; i++) expect(g.world.get(SHAFT_X, y + i)).toBe(M.AIR);
  });

  it('is deterministic', () => {
    const run = (): string => {
      const g = createGame(9);
      const y = shaftFloor(g);
      apply(g, { type: 'digPath', tiles: [0, 1, 2, 3].map((i) => ({ x: SHAFT_X, y: y + i })) });
      for (let i = 0; i < 300; i++) step(g, TICK_MS);
      return toJSON(g.state);
    };
    expect(run()).toBe(run());
  });
});

describe('saves', () => {
  it('round-trips through export and import, keeping dug tiles', () => {
    const g = createGame(3);
    const y = shaftFloor(g);
    apply(g, { type: 'dig', x: SHAFT_X, y });
    for (let i = 0; i < 200; i++) step(g, TICK_MS);
    const back = loadGame(importString(exportString(g.state)));
    expect(back.world.get(SHAFT_X, y)).toBe(M.AIR);
    expect(back.state.res.rubble).toBeInstanceOf(Decimal);
    expect(back.state.res.rubble.toString()).toBe(g.state.res.rubble.toString());
    expect(toJSON(back.state)).toBe(toJSON(g.state));
  });

  it('rejects garbage without throwing anything but a readable error', () => {
    expect(() => importString('not a save')).toThrow();
    expect(() => fromJSON('{"hello":1}')).toThrow(/Undersong/);
  });

  for (const v of [1, 2, 3, 4, 5, 6, 7, 8]) {
    it(`loads the v${v} fixture`, () => {
      const text = readFileSync(new URL(`./fixtures/saves/v${v}.json`, import.meta.url), 'utf8');
      const g = loadGame(fromJSON(text));
      expect(g.state.v).toBe(SAVE_VERSION);
      expect(g.state.seed).toBe(1234);
      expect(g.world.get(SHAFT_X, SKY_ROWS + 3)).toBe(M.AIR);
      expect(g.state.forge.recipe).toBe('auto');
      expect(g.state.res.rubble).toBeInstanceOf(Decimal);
      expect(g.state.echoesEver).toBeInstanceOf(Decimal);
      expect(typeof g.state.stats.bestPick).toBe('number');
      expect(g.state.lampProgress).toBe(0);
      expect(Array.isArray(g.state.surface.trees)).toBe(true);
      expect(g.state.res.timber).toBeInstanceOf(Decimal);
      expect(g.state.res.pepper).toBeInstanceOf(Decimal);
      expect(g.state.surface.meals.soup).toBe(0);
      expect(g.state.surface.cellar).toBe(0);
      // v8 (M9): the last run and this run's depth by minute
      expect(Array.isArray(g.state.runDepth)).toBe(true);
      expect(g.state.lastRun.miners).toBe(0);
      expect(g.state.metalwork).toEqual({});
    });
  }
});

describe('miner faces', () => {
  it('keeps the frontier equal to every solid tile beside the reach, in grid order', async () => {
    const { reach } = await import('../src/sim/reach');
    const g = createGame(9);
    g.state.res.copperBar = new Decimal(500);
    for (let i = 0; i < 6; i++) apply(g, { type: 'hireMiner' });
    for (let t = 0; t < 300_000; t += TICK_MS) step(g, TICK_MS);
    const r = reach(g);
    const w = g.world;
    const want: number[] = [];
    for (let i = 0; i < w.w * w.h; i++) {
      if (w.mat[i] === M.AIR) continue;
      const x = i % w.w;
      const near = [x > 0 ? i - 1 : -1, x < w.w - 1 ? i + 1 : -1, i - w.w, i + w.w];
      if (near.some((j) => j >= 0 && j < r.length && r[j])) want.push(i);
    }
    expect(g.frontier).toEqual(want);
  });
});
