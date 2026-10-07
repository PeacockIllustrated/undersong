// M13 quality of life: the Lately list, the keys, Keep buying, the ledger and the pin.
import { beforeEach, describe, expect, it } from 'vitest';
import { forgetAll, lately, remember } from '../src/ui/lately';
import { HOLD_BUY, LATELY_KEEP, SHORTCUTS } from '../src/data/ui';
import { KEYS_TEXT, LATELY_TEXT } from '../src/story/qol';
import { createGame } from '../src/sim/game';
import { apply } from '../src/sim/actions';
import { mineTile, step } from '../src/sim/step';
import { caveIn } from '../src/sim/cavein';
import { D } from '../src/sim/decimal';
import { minerCost, whetstoneCost } from '../src/sim/economy';
import { autoKey, fromKey, stepAutoBuy } from '../src/sim/autobuy';
import { AUTO_BUY, CAVE_IN, METALWORK } from '../src/data/economy';
import { SHAFT_X, SKY_ROWS, TICK_MS } from '../src/data/constants';
import { pinCost, pinPlace, pinShare } from '../src/ui/pin';

describe('Lately (M13-03)', () => {
  beforeEach(() => forgetAll());

  it('keeps the newest first, and only the last few', () => {
    for (let i = 0; i < LATELY_KEEP + 5; i++) remember(`toast ${i}`, '', i);
    const l = lately();
    expect(l).toHaveLength(LATELY_KEEP);
    expect(l[0]!.big).toBe(`toast ${LATELY_KEEP + 4}`);
  });

  it('folds a toast repeated straight after itself into one freshened line', () => {
    remember('+1 miner', '3 at work', 1);
    remember('+1 miner', '3 at work', 2);
    remember('+1 miner', '4 at work', 3);
    remember('Whetstone', '', 4);
    remember('+1 miner', '5 at work', 5);
    expect(lately().map((l) => l.at)).toEqual([5, 4, 3]);
    expect(lately()[2]!.sub).toBe('4 at work');
  });

  it('says how long ago in words', () => {
    expect(LATELY_TEXT.ago(5_000)).toBe('just now');
    expect(LATELY_TEXT.ago(5 * 60_000)).toBe('5 min ago');
    expect(LATELY_TEXT.ago(3 * 3_600_000)).toBe('3 h ago');
  });
});

describe('keys (M13-01, M13-02)', () => {
  it('every shortcut is listed, and none clashes with the look-around keys or mute', () => {
    const listed = KEYS_TEXT.rows.map(([k]) => k.toLowerCase());
    for (const k of Object.values(SHORTCUTS)) {
      expect(listed).toContain(k);
      expect('wasdm+-'.includes(k)).toBe(false);
    }
  });

  it('hold to buy speeds up but never runs away', () => {
    let gap: number = HOLD_BUY.everyMs;
    let t: number = HOLD_BUY.delayMs;
    let n = 0;
    while (t < 3000) {
      t += gap;
      gap = Math.max(HOLD_BUY.minMs, gap * HOLD_BUY.speedUp);
      n++;
    }
    // about two seconds of holding is a few dozen buys, not hundreds
    expect(n).toBeGreaterThan(15);
    expect(n).toBeLessThan(80);
  });
});

describe('Keep buying (M13-06)', () => {
  const ready = (seed = 21) => {
    const g = createGame(seed);
    g.state.stats.caveIns = AUTO_BUY.fromCaveIns;
    return g;
  };

  it('is offered only after enough Cave-ins, and only for buys it knows', () => {
    const g = createGame(21);
    apply(g, { type: 'autoBuy', key: 'miner', on: true });
    expect(g.state.auto.buy).toEqual([]);
    g.state.stats.caveIns = AUTO_BUY.fromCaveIns;
    apply(g, { type: 'autoBuy', key: 'miner', on: true });
    apply(g, { type: 'autoBuy', key: 'metal:nope', on: true });
    apply(g, { type: 'autoBuy', key: 'miner', on: true });
    expect(g.state.auto.buy).toEqual(['miner']);
    apply(g, { type: 'autoBuy', key: 'miner', on: false });
    expect(g.state.auto.buy).toEqual([]);
    for (const b of [{ k: 'whetstone' }, { k: 'metal', id: METALWORK[0]!.id }, { k: 'plot' }] as const)
      expect(fromKey(autoKey(b))).toEqual(b);
  });

  it('buys only while the price is a small share of what is in hand, with no toast', () => {
    const g = ready();
    const s = g.state;
    apply(g, { type: 'autoBuy', key: 'miner', on: true });
    const price = minerCost(s).amount.toNumber();
    s.res.copperBar = D(price * 5);
    stepAutoBuy(g);
    expect(s.miners.length).toBe(0);
    s.res.copperBar = D(price / AUTO_BUY.share + 1);
    stepAutoBuy(g);
    expect(s.miners.length).toBe(1);
    const ev = g.events.filter((e) => e.kind === 'bought');
    expect(ev.length).toBeGreaterThan(0);
    expect(ev.every((e) => e.kind === 'bought' && e.auto)).toBe(true);
  });

  it('survives the Cave-in, and runs once a second in the step', () => {
    const g = ready();
    const s = g.state;
    apply(g, { type: 'autoBuy', key: 'whetstone', on: true });
    s.stats.maxDepthD = s.stats.bestDepthD = 80;
    s.verses.run[CAVE_IN.verse] = s.verses.known[CAVE_IN.verse] = true;
    caveIn(g);
    expect(s.auto.buy).toEqual(['whetstone']);
    for (const c of whetstoneCost(s)) s.res[c.res] = c.amount.div(AUTO_BUY.share).mul(4);
    for (let i = 0; i < 1000 / TICK_MS; i++) step(g, TICK_MS);
    expect(s.whetstone).toBeGreaterThan(0);
  });
});

describe('the ledger (M13-05)', () => {
  it('counts tiles in all and writes how long each run took', () => {
    const g = createGame(5);
    const s = g.state;
    for (const d of [3, 4, 5]) mineTile(g, SHAFT_X + 2, SKY_ROWS + d, 'foreman');
    const dug = s.stats.tilesMined;
    expect(dug).toBe(3);
    expect(s.stats.tilesEver).toBe(dug);
    s.stats.maxDepthD = s.stats.bestDepthD = 80;
    s.verses.run[CAVE_IN.verse] = s.verses.known[CAVE_IN.verse] = true;
    s.t = 7 * 60_000;
    caveIn(g);
    expect(s.stats.tilesMined).toBe(0);
    expect(s.stats.tilesEver).toBe(dug);
    expect(s.survey.at(-1)!.min).toBe(7);
  });
});

describe('the pin (M13-04)', () => {
  it('follows a one-off buy until it is bought, and a repeatable buy for good', () => {
    const g = createGame(8);
    const s = g.state;
    expect(pinCost(s, 'pick:1')).not.toBeNull();
    expect(pinCost(s, 'pick:2')).toBeNull();
    s.pickTier = 1;
    expect(pinCost(s, 'pick:1')).toBeNull();
    expect(pinCost(s, 'k:miner')).not.toBeNull();
    expect(pinCost(s, 'nonsense')).toBeNull();
    const c = pinCost(s, 'k:miner')!;
    s.res.copperBar = c[0]!.amount.div(2);
    expect(pinShare(s, c)).toBeCloseTo(0.5);
    expect(pinPlace('k:plot').tab).toBe('fields');
    expect(pinPlace('h:dog:0')).toEqual({ tab: 'hands', card: 'helper:dog' });
  });
});
