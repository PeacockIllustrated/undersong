import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/game';
import { M } from '../src/data/materials';
import { mineTile } from '../src/sim/dig';
import { step } from '../src/sim/step';
import { VEIN_BREAK, VEIN_RUSH } from '../src/data/economy';

describe('Vein Break (M8-02)', () => {
  function setUp(chain: number) {
    const g = createGame(5);
    const x = 20;
    const y = g.world.surf[x]! + 6;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) g.world.set(x + dx, y + dy, M.STONE);
    // a vein of 5 copper tiles in an L, plus tin touching it that must stay
    const vein = [
      [x, y],
      [x + 1, y],
      [x + 2, y],
      [x + 2, y + 1],
      [x + 3, y + 2],
    ];
    for (const [vx, vy] of vein) g.world.set(vx!, vy!, M.COPPER);
    g.world.set(x - 1, y, M.TIN);
    g.state.foreman.chain = chain;
    g.state.foreman.lastOre = { x: x - 1, y: y - 1 };
    return { g, x, y, vein };
  }

  it('at the Rush cap, one ore tile breaks the rest of its vein, one after another, paid to the pack', () => {
    const chain = Math.ceil((VEIN_RUSH.max - 1) / VEIN_RUSH.step);
    const { g, x, y, vein } = setUp(chain);
    mineTile(g, x, y, 'foreman');
    expect(g.events.some((e) => e.kind === 'veinBreak' && e.n === 4)).toBe(true);
    expect(g.world.get(x + 1, y)).toBe(M.COPPER); // not all at once
    for (let i = 0; i < 10; i++) step(g, VEIN_BREAK.gapMs);
    for (const [vx, vy] of vein) expect(g.world.get(vx!, vy!)).toBe(M.AIR);
    expect(g.world.get(x - 1, y)).toBe(M.TIN);
    // each tile paid into the pack as if the Foreman broke it (the forge may already be smelting it)
    expect(g.events.filter((e) => e.kind === 'drop' && e.res === 'copperOre')).toHaveLength(5);
    expect(g.events.filter((e) => e.kind === 'shatter').map((e) => (e as { i: number }).i)).toEqual([
      0, 1, 2, 3,
    ]);
    expect(g.shatter).toBeUndefined();
  });

  it('below the cap nothing shatters', () => {
    const { g, x, y } = setUp(1);
    mineTile(g, x, y, 'foreman');
    for (let i = 0; i < 10; i++) step(g, VEIN_BREAK.gapMs);
    expect(g.world.get(x + 1, y)).toBe(M.COPPER);
  });
});
