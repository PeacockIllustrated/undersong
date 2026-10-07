// M12-01: save export and import, with a validity check and a summary shown before loading.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/game';
import { exportString, importString, saveFileName, saveSummary, toJSON } from '../src/save/codec';
import { Decimal } from '../src/sim/decimal';

describe('save export and import (M12-01)', () => {
  it('round-trips through the copied string and through plain JSON', () => {
    const g = createGame(77);
    g.state.echoes = new Decimal(42);
    g.state.stats.bestDepthD = 100;
    const a = importString(exportString(g.state));
    expect(toJSON(a)).toBe(toJSON(g.state));
    const b = importString(`  ${toJSON(g.state)}\n`);
    expect(toJSON(b)).toBe(toJSON(g.state));
  });

  it('refuses a save that is missing what the game needs, and says what', () => {
    const g = createGame(77);
    const raw = JSON.parse(toJSON(g.state)) as Record<string, unknown>;
    // a missing field is filled from a new game; a broken one is refused
    raw.foreman = 'here';
    expect(() => importString(JSON.stringify(raw))).toThrow(/Foreman/);
    const r2 = JSON.parse(toJSON(g.state)) as { verses: { known: boolean[] } };
    r2.verses.known = [true];
    expect(() => importString(JSON.stringify(r2))).toThrow(/verses/);
    expect(() => importString('{"v": 99}')).toThrow(/newer/);
    expect(() => importString('nonsense')).toThrow();
  });

  it('summarises a save before it replaces the game, and names the file by date', () => {
    const g = createGame(77);
    g.state.cycle = 4;
    g.state.stats.bestDepthD = 300;
    g.state.echoes = new Decimal(12.7);
    g.state.verses.known[0] = g.state.verses.known[3] = true;
    const sum = saveSummary(g.state);
    expect(sum.echoes.toNumber()).toBe(12);
    expect({ ...sum, echoes: 0 }).toEqual({ cycle: 4, bestFt: 1200, echoes: 0, verses: 2 });
    expect(saveFileName(new Date('2026-10-07T12:00:00Z'))).toBe('undersong-save-2026-10-07.txt');
  });
});
