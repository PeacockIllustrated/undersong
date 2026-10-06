import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/game';
import { apply } from '../src/sim/actions';
import { SHAFT_X, SKY_ROWS } from '../src/data/constants';

describe('dig queue', () => {
  const path = [4, 5, 6, 7, 8].map((d) => ({ x: SHAFT_X, y: SKY_ROWS + d }));

  it('a tap on a queued tile takes it back out', () => {
    const g = createGame(2);
    apply(g, { type: 'digPath', tiles: path });
    const n = g.state.foreman.queue.length;
    const t = g.state.foreman.queue.at(-1)!;
    apply(g, { type: 'tap', x: t.x, y: t.y, tool: 'dig' });
    expect(g.state.foreman.queue).toHaveLength(n - 1);
    expect(g.state.foreman.queue.some((q) => q.x === t.x && q.y === t.y)).toBe(false);
  });

  it('a drag over queued tiles cancels just those, and Clear empties it', () => {
    const g = createGame(2);
    apply(g, { type: 'digPath', tiles: path });
    apply(g, { type: 'unqueue', tiles: path.slice(3) });
    expect(g.state.foreman.queue.every((q) => q.y < SKY_ROWS + 7)).toBe(true);
    apply(g, { type: 'cancelDig' });
    expect(g.state.foreman.queue).toHaveLength(0);
    expect(g.state.foreman.target).toBeNull();
  });
});
