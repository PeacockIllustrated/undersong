import { describe, expect, it } from 'vitest';
import { createGame, type Game } from '../src/sim/game';
import { apply } from '../src/sim/actions';
import { step } from '../src/sim/step';
import { setWater } from '../src/sim/water';
import { charmSlots } from '../src/sim/charms';
import { D } from '../src/sim/decimal';
import { M } from '../src/data/materials';
import { CHARMS } from '../src/data/charms';
import { WATER } from '../src/data/water';
import { SHAFT_X, SKY_ROWS, TICK_MS } from '../src/data/constants';

const run = (g: Game, ms: number): void => {
  for (let t = 0; t < ms; t += TICK_MS) step(g, TICK_MS);
};

/** A reachable room joined to the shaft, with the foreman standing in it. */
function room(g: Game, d = 60, w = 10, h = 5): { x0: number; y1: number } {
  const y0 = SKY_ROWS + d;
  for (let y = SKY_ROWS; y < y0 + h; y++) g.world.set(SHAFT_X, y, M.AIR);
  for (let y = y0; y < y0 + h; y++) for (let x = SHAFT_X - w; x < SHAFT_X; x++) g.world.set(x, y, M.AIR);
  g.state.foreman.x = SHAFT_X;
  g.state.foreman.y = y0 - 2;
  g.state.stats.maxDepthD = d + h;
  return { x0: SHAFT_X - w, y1: y0 + h - 1 };
}

const total = (g: Game): number => g.world.water.reduce((a, v) => a + v, 0);

describe('water', () => {
  it('settles without losing a drop', () => {
    const g = createGame(3);
    const { x0, y1 } = room(g);
    for (let x = x0; x < x0 + 3; x++) setWater(g, g.world.idx(x, y1 - 3), WATER.full);
    const before = total(g);
    run(g, 5000);
    expect(total(g)).toBe(before);
    // it fell to the floor and spread along it
    expect(g.world.water[g.world.idx(x0 + 6, y1)]).toBeGreaterThan(0);
    expect(g.world.water[g.world.idx(x0, y1 - 3)]).toBe(0);
  });

  it('a pump drains the water around it', () => {
    const g = createGame(3);
    const { x0, y1 } = room(g);
    for (let x = x0; x < x0 + 6; x++) setWater(g, g.world.idx(x, y1), WATER.full);
    run(g, 1000);
    const before = total(g);
    g.state.world.objects[String(g.world.idx(x0 + 3, y1 - 2))] = 'pump';
    run(g, 2000);
    expect(total(g)).toBeLessThan(before);
  });

  it('Bram’s pump crew makes a pump and sets it at the water', () => {
    const g = createGame(3);
    const s = g.state;
    const { x0, y1 } = room(g);
    for (let x = x0; x < SHAFT_X; x++) setWater(g, g.world.idx(x, y1), WATER.full);
    s.story.ever.push('flooded');
    s.res.silverBar = D(20);
    s.res.ironBar = D(40);
    apply(g, { type: 'hireHelper', id: 'pumps' });
    expect(s.helpers.pumps).toBe(1);
    run(g, 2000);
    expect(Object.values(s.world.objects)).toContain('pump');
  });
});

describe('Song-loom charms', () => {
  it('weaves a known verse into a charm and wears it, and the charm outlasts a Cave-in', () => {
    const g = createGame(5);
    const s = g.state;
    const c = CHARMS[5]!;
    s.buildings.songloom = 1;
    s.verses.known[c.verse] = true;
    s.res.crystal = D(100);
    s.res.silverBar = D(100);
    apply(g, { type: 'weave', id: c.id });
    expect(s.charms.owned).toContain(c.id);
    expect(s.charms.equipped).toContain(c.id);
    expect(s.charms.equipped.length).toBeLessThanOrEqual(charmSlots(s));
    s.stats.maxDepthD = 80;
    s.verses.run[1] = true;
    apply(g, { type: 'caveIn' });
    expect(s.charms.owned).toContain(c.id);
  });
});
