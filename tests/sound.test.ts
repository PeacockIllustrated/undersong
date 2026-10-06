import { describe, expect, it } from 'vitest';
import { Throttle, breakCue, cuesFor, semis, verseNotes } from '../src/audio/cues';
import { CUES, RUSH_SEMITONES_MAX, VERSE_MOTIF, VERSE_PHRASE } from '../src/data/sounds';
import { M } from '../src/data/materials';

describe('sound cues (ADR-027)', () => {
  it('gives each material family its own crunch', () => {
    expect(breakCue(M.DIRT)).toBe('breakSoft');
    expect(breakCue(M.STONE)).toBe('breakStone');
    expect(breakCue(M.COPPER)).toBe('breakOre');
    expect(breakCue(M.CRYSTAL)).toBe('breakCrystal');
  });

  it('hears the Foreman everywhere, but a miner only on screen', () => {
    const mined = { kind: 'mined', x: 1, y: 1, m: M.STONE } as const;
    expect(cuesFor({ ...mined, by: 'foreman' }, false, 0)).toEqual([{ id: 'breakStone' }]);
    expect(cuesFor({ ...mined, by: 'miner' }, false, 0)).toEqual([]);
    expect(cuesFor({ ...mined, by: 'miner' }, true, 0)).toEqual([{ id: 'breakFar' }]);
  });

  it('raises the drop chime with the Vein Rush, up to an octave', () => {
    const drop = { kind: 'drop', x: 0, y: 0, res: 'copperOre', n: 1 } as const;
    const pitch = (chain: number): number => cuesFor(drop, true, chain)[0]!.pitch!;
    expect(pitch(0)).toBe(1);
    expect(pitch(2)).toBeGreaterThan(pitch(1));
    expect(pitch(99)).toBeCloseTo(semis(RUSH_SEMITONES_MAX));
  });

  it('plays the song so far for a verse, ending on its own note', () => {
    expect(verseNotes(0)).toEqual([VERSE_MOTIF[0]]);
    const xii = verseNotes(11);
    expect(xii).toHaveLength(VERSE_PHRASE);
    expect(xii.at(-1)).toBe(VERSE_MOTIF[11]);
    expect(VERSE_MOTIF).toHaveLength(12);
  });

  it('throttles a cue to its gap', () => {
    const t = new Throttle();
    expect(t.allow('chip', CUES.chip.gap, 0)).toBe(true);
    expect(t.allow('chip', CUES.chip.gap, CUES.chip.gap - 1)).toBe(false);
    expect(t.allow('chip', CUES.chip.gap, CUES.chip.gap)).toBe(true);
    expect(t.allow('drop', CUES.drop.gap, 1)).toBe(true);
  });
});
