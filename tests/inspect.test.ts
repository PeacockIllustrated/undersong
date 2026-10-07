import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/game';
import { M } from '../src/data/materials';
import { inspect } from '../src/sim/inspect';
import { hoverLines } from '../src/story/hover';

describe('hover label (M7-03)', () => {
  const g = createGame(2);
  const x = 20;
  const y = g.world.surf[x]! + 4;

  it('names the rock, the Foreman time and the drop', () => {
    g.world.set(x, y, M.COPPER);
    const i = inspect(g, x, y)!;
    expect(i.needs).toBeUndefined();
    expect(i.secs).toBeGreaterThan(0);
    const l = hoverLines(i);
    expect(l.warn).toBe(false);
    expect(l.sub).toMatch(/^Foreman \d/);
    expect(l.sub).toContain('Copper ore');
  });

  it('says which pick a too-hard tile wants, as a warning', () => {
    g.world.set(x, y, M.IRON);
    const l = hoverLines(inspect(g, x, y)!);
    expect(l.warn).toBe(true);
    expect(l.sub).toMatch(/^Needs the .+ pick$/);
  });

  it('shows nothing for air', () => {
    g.world.set(x, y, M.AIR);
    expect(inspect(g, x, y)).toBeNull();
  });
});
