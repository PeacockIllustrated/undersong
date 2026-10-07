// M11 Beyond the song: Endless Depth markers, deep picks, Auto Cave-in and the keys of New Song+.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/game';
import { apply } from '../src/sim/actions';
import { D } from '../src/sim/decimal';
import { caveIn, echoGain } from '../src/sim/cavein';
import { chooseEnding } from '../src/sim/ending';
import {
  deepPickCost,
  deepPickOpen,
  markerD,
  markerReward,
  markersReached,
  nextKey,
  stepAuto,
  stepMarkers,
} from '../src/sim/beyond';
import { keyDrop, keyRain } from '../src/sim/keys';
import { pickPower, villageMult } from '../src/sim/power';
import { heatAt } from '../src/sim/heat';
import { stepSurface } from '../src/sim/surface';
import { RAIN } from '../src/data/finds';
import { AUTO_CAVEIN, DEEP_PICK, ENDLESS_MARK, KEY_FX, KEYS } from '../src/data/beyond';
import { CAVE_IN } from '../src/data/economy';
import { HEAT } from '../src/data/heat';
import { PICKS } from '../src/data/items';
import { SHAFT_X, SKY_ROWS } from '../src/data/constants';

type G = ReturnType<typeof createGame>;
const sealed = (seed = 3): G => {
  const g = createGame(seed);
  g.state.ending = 'seal';
  return g;
};
const readyToCaveIn = (g: G): void => {
  g.state.stats.maxDepthD = g.state.stats.bestDepthD = 80;
  g.state.verses.run[CAVE_IN.verse] = g.state.verses.known[CAVE_IN.verse] = true;
};

describe('Endless Depth markers (M11-01)', () => {
  it('stand every 500 ft under the Heart and only count once the shaft is sealed', () => {
    const g = createGame(3);
    g.state.stats.maxDepthD = markerD(2);
    expect(markersReached(g.state)).toBe(0);
    g.state.ending = 'seal';
    expect(markersReached(g.state)).toBe(2);
    expect(markerD(2) - markerD(1)).toBe(ENDLESS_MARK.everyD);
  });

  it('pay Echoes and gold that grow each time, once ever', () => {
    const g = sealed();
    g.state.stats.maxDepthD = markerD(2);
    stepMarkers(g);
    const want = markerReward(1).echoes + markerReward(2).echoes;
    expect(markerReward(2).echoes).toBeGreaterThan(markerReward(1).echoes);
    expect(g.state.echoes.toNumber()).toBe(want);
    expect(g.state.res.goldBar.toNumber()).toBe(markerReward(1).gold + markerReward(2).gold);
    expect(g.events.filter((e) => e.kind === 'marker')).toHaveLength(2);
    stepMarkers(g);
    expect(g.state.echoes.toNumber()).toBe(want);
    // a later run reaching the same marker pays nothing more
    readyToCaveIn(g);
    caveIn(g);
    const e = g.state.echoes.toNumber();
    g.state.stats.maxDepthD = markerD(2);
    stepMarkers(g);
    expect(g.state.echoes.toNumber()).toBe(e);
    expect(g.state.endlessPaid).toBe(2);
  });
});

describe('deep picks (M11-01)', () => {
  it('follow the Heart pick, each doubling pick power, one per marker reached this run', () => {
    const g = sealed();
    const s = g.state;
    expect(deepPickCost(s)).toBeNull();
    s.pickTier = PICKS.length - 1;
    const p0 = pickPower(s);
    expect(deepPickOpen(s)).toBe(false);
    s.stats.maxDepthD = markerD(1);
    expect(deepPickOpen(s)).toBe(true);
    s.res.crystal = D(1e6);
    s.res.goldBar = D(1e6);
    const c1 = deepPickCost(s)!;
    apply(g, { type: 'deepPick' });
    expect(s.deepPick).toBe(1);
    expect(pickPower(s)).toBe(p0 * DEEP_PICK.mult);
    expect(deepPickCost(s)![0]!.amount.toNumber()).toBe(c1[0]!.amount.toNumber() * DEEP_PICK.grow);
    // the next waits for the next marker
    apply(g, { type: 'deepPick' });
    expect(s.deepPick).toBe(1);
    s.stats.maxDepthD = markerD(2);
    apply(g, { type: 'deepPick' });
    expect(pickPower(s)).toBe(p0 * DEEP_PICK.mult ** 2);
  });

  it('are forgotten in a Cave-in', () => {
    const g = sealed();
    g.state.deepPick = 3;
    readyToCaveIn(g);
    caveIn(g);
    expect(g.state.deepPick).toBe(0);
  });
});

describe('Auto Cave-in (M11-02)', () => {
  it('is only offered after the ending', () => {
    const g = createGame(5);
    apply(g, { type: 'autoCaveIn', on: true });
    expect(g.state.auto.caveIn).toBe(false);
    g.state.ending = 'sing';
    apply(g, { type: 'autoCaveIn', on: true });
    expect(g.state.auto.caveIn).toBe(true);
  });

  it('caves in once the Echoes on offer have stood still, and logs it', () => {
    const g = createGame(5);
    const s = g.state;
    s.ending = 'sing';
    apply(g, { type: 'autoCaveIn', on: true });
    readyToCaveIn(g);
    stepAuto(g);
    expect(s.auto.best).toBe(echoGain(s).toNumber());
    s.t += AUTO_CAVEIN.stallMs - 1000;
    stepAuto(g);
    expect(s.stats.caveIns).toBe(0);
    // a deeper dig raises the offer and restarts the clock
    s.stats.maxDepthD = 120;
    stepAuto(g);
    s.t += AUTO_CAVEIN.stallMs - 1000;
    stepAuto(g);
    expect(s.stats.caveIns).toBe(0);
    s.t += 1000;
    stepAuto(g);
    expect(s.stats.caveIns).toBe(1);
    expect(s.survey.at(-1)!.auto).toBe(true);
    expect(g.events.some((e) => e.kind === 'autoCaveIn')).toBe(true);
    expect(s.story.events.some((e) => e.kind === 'caveIn')).toBe(false);
    expect(s.auto.caveIn).toBe(true);
    expect(s.auto.best).toBe(0);
  });

  it('never caves in while you are away or ahead of the ending’s choice', () => {
    const g = createGame(5);
    const s = g.state;
    s.ending = 'sing';
    s.auto.caveIn = true;
    readyToCaveIn(g);
    stepAuto(g);
    s.t += AUTO_CAVEIN.stallMs * 2;
    g.offline = true;
    stepAuto(g);
    expect(s.stats.caveIns).toBe(0);
    g.offline = false;
    s.verses.run[11] = true;
    stepAuto(g);
    expect(s.stats.caveIns).toBe(0);
  });
});

describe('the keys of New Song+ (M11-03)', () => {
  it('shows the next key before the choice, and singing sets it', () => {
    const g = createGame(8);
    const s = g.state;
    readyToCaveIn(g);
    s.verses.run[11] = true;
    const k = nextKey(s);
    expect(KEYS).toContain(k);
    expect(chooseEnding(g, 'sing')).toBe(true);
    expect(s.songKey).toBe(k);
    // the next song never repeats the key the mountain is in
    for (let c = 0; c < 20; c++) {
      s.cycle = c;
      expect(nextKey(s)).not.toBe(k);
    }
    // sealing leaves the key alone
    readyToCaveIn(g);
    s.verses.run[11] = true;
    chooseEnding(g, 'seal');
    expect(s.songKey).toBe(k);
  });

  it('there are at least four, and each changes a rule', () => {
    expect(KEYS.length).toBeGreaterThanOrEqual(4);
    expect(keyDrop('rich', 'copperOre')).toBe(KEY_FX.rich.drop);
    expect(keyDrop('rich', 'rubble')).toBe(1);
    expect(keyDrop('hot', 'emberOre')).toBe(KEY_FX.hot.drop);
    expect(keyDrop('hot', 'copperOre')).toBe(1);
    expect(keyRain('wet').often).toBe(KEY_FX.wet.rainOften);
    expect(keyRain(null).often).toBe(1);

    const g = createGame(4);
    const s = g.state;
    readyToCaveIn(g);
    const e0 = echoGain(s).toNumber();
    const v0 = villageMult(s);
    s.songKey = 'hard';
    expect(villageMult(s)).toBeCloseTo(v0 * KEY_FX.hard.dig);
    expect(echoGain(s).toNumber()).toBe(Math.floor(e0 * KEY_FX.hard.echoes));

    // a hot year warms the deep higher up
    const y = SKY_ROWS + HEAT.fromD - 10;
    s.songKey = null;
    g.heat.clear();
    const cool = heatAt(g, SHAFT_X, y);
    s.songKey = 'hot';
    g.heat.clear();
    expect(heatAt(g, SHAFT_X, y)).toBeGreaterThan(cool);
  });

  it('a wet year brings rain sooner and longer', () => {
    const g = createGame(6);
    const s = g.state;
    s.songKey = 'wet';
    s.surface.tansy = true;
    s.surface.rainNext = 0;
    s.t = 1000;
    stepSurface(g, 0.1);
    expect(s.surface.rainUntil - s.t).toBe(RAIN.lastsMs * KEY_FX.wet.rainLong);
  });
});
