import { describe, expect, it } from 'vitest';
import { DEFAULTS, clean, reducedMotion, setSettings, settings } from '../src/settings';
import { fmt } from '../src/ui/format';
import { D } from '../src/sim/decimal';

describe('settings', () => {
  it('falls back to the defaults for anything unknown or out of range', () => {
    expect(clean({})).toEqual(DEFAULTS);
    expect(
      clean({
        motion: 'wobbly' as never,
        textScale: 7,
        marks: 'yes' as never,
        numbers: 'roman' as never,
        sound: 0.5,
        music: -1,
      }),
    ).toEqual(DEFAULTS);
    expect(
      clean({ motion: 'reduced', textScale: 1.3, marks: false, numbers: 'scientific', sound: 0, music: 1 }),
    ).toEqual({
      motion: 'reduced',
      textScale: 1.3,
      marks: false,
      numbers: 'scientific',
      sound: 0,
      music: 1,
    });
  });

  it('reduced motion can be chosen whatever the system says', () => {
    setSettings({ motion: 'reduced' });
    expect(reducedMotion()).toBe(true);
    setSettings({ motion: 'full' });
    expect(reducedMotion()).toBe(false);
    setSettings({ motion: 'auto' });
  });

  it('numbers can be shown in scientific notation', () => {
    expect(fmt(D(1_500_000))).toBe('1.5M');
    setSettings({ numbers: 'scientific' });
    expect(fmt(D(1_500_000))).toBe('1.50e6');
    expect(fmt(D(12))).toBe('12');
    setSettings({ numbers: 'short' });
    expect(settings().numbers).toBe('short');
  });
});
