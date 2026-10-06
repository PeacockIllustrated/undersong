import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/game';
import { apply } from '../src/sim/actions';
import { caveIn } from '../src/sim/cavein';
import { nextTip } from '../src/story/tips';
import { D } from '../src/sim/decimal';

describe('tip cards', () => {
  it('shows a tip once its system appears, and never again once noted, even after a Cave-in', () => {
    const g = createGame(3);
    expect(nextTip(g.state)).toBeUndefined();
    g.state.res.support = D(2);
    expect(nextTip(g.state)?.id).toBe('support');
    apply(g, { type: 'note', key: 'tip:support' });
    expect(nextTip(g.state)).toBeUndefined();
    caveIn(g);
    g.state.res.support = D(2);
    expect(nextTip(g.state)).toBeUndefined();
  });

  it('only notes tip and tab keys, once each', () => {
    const g = createGame(3);
    apply(g, { type: 'note', key: 'tab:hands' });
    apply(g, { type: 'note', key: 'tab:hands' });
    apply(g, { type: 'note', key: 'flooded' });
    expect(g.state.story.ever.filter((k) => k === 'tab:hands')).toHaveLength(1);
    expect(g.state.story.ever).not.toContain('flooded');
  });
});
