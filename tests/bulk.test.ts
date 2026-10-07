import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/game';
import { apply } from '../src/sim/actions';
import { bulkCost } from '../src/sim/bulk';
import { minerCost, whetstoneCost } from '../src/sim/economy';
import { D } from '../src/sim/decimal';

describe('buy ×10 and Max (M8-03)', () => {
  it('prices ten miners as the sum of ten single hires', () => {
    const g = createGame(1);
    const s = g.state;
    const b = bulkCost(s, { k: 'miner' }, 10)!;
    s.res.copperBar = D(1e6);
    let sum = D(0);
    for (let i = 0; i < 10; i++) {
      sum = sum.add(minerCost(s).amount);
      apply(g, { type: 'hireMiner' });
    }
    expect(b.n).toBe(10);
    expect(b.costs[0]!.amount.eq(sum)).toBe(true);
  });

  it('Max buys as many as can be paid for, and says so once', () => {
    const g = createGame(1);
    const s = g.state;
    s.res.copperBar = D(20);
    const b = bulkCost(s, { k: 'whetstone' }, 'max')!;
    let spent = D(0);
    for (let i = 0; i < b.n; i++)
      spent = spent.add(whetstoneCost({ ...s, whetstone: s.whetstone + i })[0]!.amount);
    expect(spent.lte(20)).toBe(true);
    expect(spent.add(whetstoneCost({ ...s, whetstone: s.whetstone + b.n })[0]!.amount).gt(20)).toBe(true);
    g.events.length = 0;
    apply(g, { type: 'buyMany', of: { k: 'whetstone' }, n: 'max' });
    expect(s.whetstone).toBe(b.n);
    const bought = g.events.filter((e) => e.kind === 'bought');
    expect(bought).toHaveLength(1);
    expect(bought[0]).toMatchObject({ what: 'whetstone', n: b.n });
  });

  it('prices the next one even when it cannot be paid for', () => {
    const g = createGame(1);
    g.state.res.copperBar = D(0);
    expect(bulkCost(g.state, { k: 'miner' }, 'max')?.n).toBe(1);
  });
});
