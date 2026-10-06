import { describe, expect, it } from 'vitest';
import { createGame, loadGame, type Game } from '../src/sim/game';
import { apply } from '../src/sim/actions';
import { step } from '../src/sim/step';
import { heatAt, coolCache } from '../src/sim/heat';
import { echoGain } from '../src/sim/cavein';
import { endingReady } from '../src/sim/ending';
import { fromJSON, toJSON } from '../src/save/codec';
import { M } from '../src/data/materials';
import { HEAT, ENDLESS } from '../src/data/heat';
import { BASE_WORLD_H, HEART_FLOOR_D, SKY_ROWS, TICK_MS } from '../src/data/constants';

const Y = (d: number): number => SKY_ROWS + d;

/** A 5×3 pocket of air at depth d with plain basalt round it. */
function pocket(g: Game, d: number, x = 30): void {
  for (let y = Y(d) - 5; y <= Y(d) + 5; y++)
    for (let xx = x - 6; xx <= x + 6; xx++) g.world.set(xx, y, M.BASALT);
  for (let y = Y(d) - 1; y <= Y(d) + 1; y++)
    for (let xx = x - 2; xx <= x + 2; xx++) g.world.set(xx, y, M.AIR);
  coolCache(g);
}

describe('heat', () => {
  it('is nothing above the Ember Deep and rises with depth', () => {
    const g = createGame(5);
    pocket(g, 200);
    pocket(g, 300);
    expect(heatAt(g, 30, Y(200))).toBe(0);
    expect(heatAt(g, 30, Y(300))).toBeCloseTo(HEAT.ambientPerTile * 50);
  });

  it('ember ore warms the faces near it, and a vent cools them', () => {
    const g = createGame(5);
    pocket(g, 330);
    const before = heatAt(g, 30, Y(330));
    for (let x = 28; x <= 32; x++) g.world.set(x, Y(330) + 2, M.EMBER);
    for (let x = 28; x <= 32; x++) g.world.set(x, Y(330) - 2, M.EMBER);
    const hot = heatAt(g, 30, Y(330));
    expect(hot).toBeGreaterThan(before);
    expect(hot).toBeGreaterThanOrEqual(HEAT.stopAt);
    apply(g, { type: 'tap', x: 29, y: Y(330), tool: 'vent' });
    expect(g.world.objectAt(29, Y(330))).toBeUndefined(); // nothing in stock, nothing placed
    g.state.world.objects[String(g.world.idx(29, Y(330)))] = 'vent';
    coolCache(g);
    expect(heatAt(g, 30, Y(330))).toBeCloseTo(Math.max(0, hot - HEAT.ventCool));
  });
});

describe('the ending', () => {
  function atHeart(g: Game): void {
    const s = g.state;
    s.stats.maxDepthD = HEART_FLOOR_D - 5;
    s.stats.bestDepthD = s.stats.maxDepthD;
    s.verses.run = new Array(12).fill(true);
    s.verses.known = new Array(12).fill(true);
  }

  it('is offered once Verse XII is sung, and not before', () => {
    const g = createGame(7);
    expect(endingReady(g.state)).toBe(false);
    atHeart(g);
    expect(endingReady(g.state)).toBe(true);
  });

  it('sealing the shaft closes the cycle and opens Endless Depth', () => {
    const g = createGame(7);
    atHeart(g);
    const cycle = g.state.cycle;
    apply(g, { type: 'chooseEnding', which: 'seal' });
    const s = g.state;
    expect(s.ending).toBe('seal');
    expect(s.cycle).toBe(cycle + 1);
    expect(s.world.endlessRows).toBe(ENDLESS.rows);
    expect(g.world.h).toBe(BASE_WORLD_H + ENDLESS.rows);
    expect(s.story.events[0]).toEqual({ kind: 'ending', which: 'seal' });
    // below the old floor there is rock to dig now, not bedrock
    expect(g.world.get(30, Y(HEART_FLOOR_D + 10))).not.toBe(M.BEDROCK);
    expect(endingReady(s)).toBe(false);
  });

  it('Endless Depth grows when the village nears its floor, and reloads the same', () => {
    const g = createGame(7);
    atHeart(g);
    apply(g, { type: 'chooseEnding', which: 'seal' });
    const floor = HEART_FLOOR_D + g.state.world.endlessRows;
    g.reachMaxY = Y(floor - ENDLESS.margin + 1);
    g.reachDirty = false;
    step(g, TICK_MS * 10);
    expect(g.state.world.endlessRows).toBe(2 * ENDLESS.rows);
    expect(g.world.h).toBe(BASE_WORLD_H + 2 * ENDLESS.rows);
    const again = loadGame(fromJSON(toJSON(g.state)));
    expect(again.world.h).toBe(g.world.h);
    const y = Y(floor + 20);
    for (let x = 1; x < g.world.w - 1; x++) expect(again.world.get(x, y)).toBe(g.world.get(x, y));
  });

  it('singing the last verse starts New Song+, which pays more Echoes', () => {
    const g = createGame(7);
    atHeart(g);
    const plain = echoGain(g.state);
    apply(g, { type: 'chooseEnding', which: 'sing' });
    const s = g.state;
    expect(s.ending).toBe('sing');
    expect(s.ngPlus).toBe(1);
    expect(s.world.endlessRows).toBe(0);
    s.stats.maxDepthD = HEART_FLOOR_D - 5;
    s.verses.run = new Array(12).fill(true);
    expect(echoGain(s).gt(plain)).toBe(true);
  });
});
