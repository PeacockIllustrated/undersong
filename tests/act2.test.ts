import { describe, expect, it } from 'vitest';
import { createGame, type Game } from '../src/sim/game';
import { apply } from '../src/sim/actions';
import { step } from '../src/sim/step';
import { caveIn } from '../src/sim/cavein';
import { nextHaul } from '../src/sim/economy';
import { maybeCollapse, lumenUpkeep } from '../src/sim/village';
import { catchUp } from '../src/save/offline';
import { D } from '../src/sim/decimal';
import { M } from '../src/data/materials';
import { COLLAPSE, CRAFTS, ECHO_POWER, KILN, LAMPWORKS } from '../src/data/economy';
import { SHAFT_X, SKY_ROWS, TICK_MS } from '../src/data/constants';
import { OFFLINE } from '../src/data/upgrades';

const run = (g: Game, ms: number): void => {
  for (let t = 0; t < ms; t += TICK_MS) step(g, TICK_MS);
};

/** Open a reachable room in Glowroot, joined to the shaft, and stand the foreman in it. */
function room(g: Game, d = 50, w = 8, h = 4): { x0: number; y0: number } {
  const y0 = SKY_ROWS + d;
  for (let y = SKY_ROWS; y < y0 + h; y++) g.world.set(SHAFT_X, y, M.AIR);
  for (let y = y0; y < y0 + h; y++) for (let x = SHAFT_X - w; x < SHAFT_X; x++) g.world.set(x, y, M.AIR);
  g.state.foreman.x = SHAFT_X - 1;
  g.state.foreman.y = y0 + h - 1;
  g.state.stats.maxDepthD = d + h;
  return { x0: SHAFT_X - w, y0 };
}

describe('Kiln and Lamp-works', () => {
  it('builds only once the village is deep enough, then bakes bricks from rubble', () => {
    const g = createGame(7);
    g.state.res.copperBar = D(100);
    apply(g, { type: 'buyBuilding', id: 'kiln' });
    expect(g.state.buildings.kiln).toBe(0);
    g.state.stats.maxDepthD = 25;
    apply(g, { type: 'buyBuilding', id: 'kiln' });
    expect(g.state.buildings.kiln).toBe(1);
    expect(g.state.res.copperBar.toNumber()).toBe(80);
    g.state.res.rubble = D(KILN.rubble * 3);
    run(g, KILN.seconds * 3 * 1000 + 200);
    expect(g.state.res.brick.toNumber()).toBe(3);
    expect(g.state.res.rubble.toNumber()).toBe(0);
  });

  it('turns spores into Lumen, and lanterns burn it until they go dark', () => {
    const g = createGame(7);
    const { x0, y0 } = room(g);
    g.state.res.ironBar = D(100);
    apply(g, { type: 'buyBuilding', id: 'lampworks' });
    expect(g.state.buildings.lampworks).toBe(1);
    g.state.res.spores = D(4);
    run(g, 4100);
    expect(g.state.res.lumen.toNumber()).toBe(4 * LAMPWORKS.lumen);
    apply(g, { type: 'craft', id: 'lantern' });
    expect(g.state.res.lantern.toNumber()).toBe(1);
    const left = 4 * LAMPWORKS.lumen - CRAFTS.lantern.cost[1]!.n;
    expect(g.state.res.lumen.toNumber()).toBe(left);
    apply(g, { type: 'tap', x: x0 + 1, y: y0 + 3, tool: 'lantern' });
    expect(g.world.objectAt(x0 + 1, y0 + 3)).toBe('lantern');
    expect(lumenUpkeep(g)).toBeCloseTo(LAMPWORKS.upkeepPerLantern);
    const lit = g.world.lightAt(x0 + 1, y0 + 3);
    expect(lit).toBeGreaterThan(1.4);
    run(g, (left / LAMPWORKS.upkeepPerLantern) * 1000 + 500);
    expect(g.state.res.lumen.toNumber()).toBe(0);
    expect(g.world.lanternsLit).toBe(false);
    expect(g.world.lightAt(x0 + 1, y0 + 3)).toBeLessThan(lit);
    // and picking it back up returns the stock
    apply(g, { type: 'tap', x: x0 + 1, y: y0 + 3, tool: 'lantern' });
    expect(g.state.res.lantern.toNumber()).toBe(1);
  });

  it('lets a moth dim a lantern until it is tapped', () => {
    const g = createGame(9);
    const { x0, y0 } = room(g);
    g.state.res.lumen = D(1e6);
    g.state.res.lantern = D(1);
    apply(g, { type: 'tap', x: x0 + 2, y: y0 + 3, tool: 'lantern' });
    for (let i = 0; i < 20000 && !g.state.pests.length; i++) step(g, TICK_MS);
    const moth = g.state.pests[0]!;
    expect(moth.kind).toBe('moth');
    expect(g.world.dimmed.has(g.world.idx(x0 + 2, y0 + 3))).toBe(true);
    apply(g, { type: 'tap', x: moth.x, y: moth.y, tool: 'dig' });
    expect(g.state.pests).toHaveLength(0);
    expect(g.world.dimmed.size).toBe(0);
  });
});

describe('rails and collapses', () => {
  it('charges rails per 10 tiles of mine depth', () => {
    const g = createGame(3);
    g.state.haulTier = 1;
    g.state.stats.maxDepthD = 45;
    expect(nextHaul(g.state)![0]!.amount.toNumber()).toBe(8 * 5);
  });

  it('drops the roof of a wide unsupported room, but never on the foreman or the shaft', () => {
    const g = createGame(11);
    const { x0, y0 } = room(g, 50, 10, 5);
    let fell = false;
    for (let k = 0; k < 400 && !fell; k++) {
      maybeCollapse(g, x0 + 4, y0 + 2);
      fell = g.state.stats.collapses > 0;
    }
    expect(fell).toBe(true);
    expect(g.world.get(g.state.foreman.x, g.state.foreman.y)).toBe(M.AIR);
    for (let y = SKY_ROWS; y < y0 + 5; y++) expect(g.world.get(SHAFT_X, y)).toBe(M.AIR);
    let rubble = 0;
    for (let y = y0; y < y0 + 5; y++)
      for (let x = x0; x < SHAFT_X; x++) if (g.world.get(x, y) === M.RUBBLE) rubble++;
    expect(rubble).toBeGreaterThan(0);
    expect(rubble).toBeLessThanOrEqual(COLLAPSE.fill);
  });

  it('holds a supported room up', () => {
    const g = createGame(11);
    const { x0, y0 } = room(g, 50, 10, 5);
    g.state.res.support = D(1);
    apply(g, { type: 'tap', x: x0 + 4, y: y0 + 4, tool: 'support' });
    for (let k = 0; k < 400; k++) maybeCollapse(g, x0 + 4, y0 + 2);
    expect(g.state.stats.collapses).toBe(0);
  });
});

describe('Echo carry-overs', () => {
  it('keeps lifetime Echoes, the heirloom pick, old shafts and Bram’s ledger through a Cave-in', () => {
    const g = createGame(5);
    const s = g.state;
    Object.assign(s.upgrades, { heirloomPick: 1, oldShafts: 1, bramsLedger: 1 });
    s.stats.maxDepthD = 80;
    s.stats.bestDepthD = 80;
    s.stats.bestPick = 4;
    s.verses.run[1] = true;
    expect(caveIn(g)).toBe(true);
    expect(s.echoesEver.gt(0)).toBe(true);
    expect(s.echoesEver.eq(s.echoes)).toBe(true);
    expect(s.pickTier).toBe(3);
    expect(s.world.oldShaftD).toBe(40);
    for (let d = 1; d <= 40; d++) expect(g.world.get(SHAFT_X, SKY_ROWS + d)).toBe(M.AIR);
    expect(s.res.copperBar.toNumber()).toBe(30);
    expect(s.res.tinBar.toNumber()).toBe(10);
  });

  it('speeds miners with lifetime Echoes', async () => {
    const { minerMult } = await import('../src/sim/power');
    const g = createGame(5);
    expect(minerMult(g.state)).toBe(1);
    g.state.echoesEver = D(10);
    expect(minerMult(g.state)).toBeCloseTo(1 + 10 * ECHO_POWER);
  });
});

describe('offline progress', () => {
  it('ignores short absences', () => {
    const g = createGame(2);
    expect(catchUp(g, 30_000)).toBeNull();
  });

  it('credits capped time at the canon efficiency and reports gains', () => {
    const g = createGame(2);
    g.state.res.copperBar = D(200);
    for (let i = 0; i < 4; i++) apply(g, { type: 'hireMiner' });
    run(g, 5000);
    const r = catchUp(g, 24 * 3600_000)!;
    expect(r.creditedS).toBe(OFFLINE.capH * 3600 * OFFLINE.eff);
    expect(r.tiles).toBeGreaterThan(50);
    expect(r.gains.length).toBeGreaterThan(0);
    expect(g.state.pests).toHaveLength(0);
    expect(g.offline).toBe(false);
  });
});
