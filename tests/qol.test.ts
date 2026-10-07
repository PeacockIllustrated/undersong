// M13 quality of life: the Lately list and the key list.
import { beforeEach, describe, expect, it } from 'vitest';
import { forgetAll, lately, remember } from '../src/ui/lately';
import { HOLD_BUY, LATELY_KEEP, SHORTCUTS } from '../src/data/ui';
import { KEYS_TEXT, LATELY_TEXT } from '../src/story/qol';

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
