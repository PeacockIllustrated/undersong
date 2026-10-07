import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/game';
import { M } from '../src/data/materials';
import { snapToOre, veinTiles } from '../src/sim/smartdig';
import { workable } from '../src/sim/reach';
import type { Game } from '../src/sim/game';

/** The first rock tile anyone could work now, with a 7×7 box of plain stone around it below the surface. */
function setUp(): { g: Game; x: number; y: number } {
  const g = createGame(2);
  for (let y = 0; y < g.world.h; y++)
    for (let x = 3; x < g.world.w - 3; x++)
      if (g.world.get(x, y) !== M.AIR && y > g.world.surf[x]! && workable(g, x, y)) {
        for (let dy = -3; dy <= 3; dy++)
          for (let dx = -3; dx <= 3; dx++)
            if (g.world.get(x + dx, y + dy) !== M.AIR) g.world.set(x + dx, y + dy, M.STONE);
        g.reachDirty = true;
        if (workable(g, x, y)) return { g, x, y };
      }
  throw new Error('no workable rock');
}

describe('smart dig', () => {
  it('a tap on rock beside workable ore digs the ore; plain rock stays put', () => {
    const { g, x, y } = setUp();
    expect(snapToOre(g, x, y)).toEqual({ x, y });
    g.world.set(x, y, M.COPPER);
    g.reachDirty = true;
    const [ax, ay] = g.world.get(x + 1, y) === M.STONE ? [x + 1, y] : [x, y + 1];
    expect(snapToOre(g, ax, ay)).toEqual({ x, y });
    // the ore itself is never moved off
    expect(snapToOre(g, x, y)).toEqual({ x, y });
  });

  it('a long press takes the connected vein, nearest first, and nothing else', () => {
    const { g, x, y } = setUp();
    // a diagonal vein running into solid rock, whichever side of the face that is
    const d = g.world.get(x + 1, y + 1) === M.STONE && g.world.get(x + 2, y + 2) === M.STONE ? 1 : -1;
    const vein = [
      { x, y },
      { x: x + d, y: y + 1 },
      { x: x + 2 * d, y: y + 2 },
    ];
    for (const t of vein) g.world.set(t.x, t.y, M.COPPER);
    if (g.world.get(x - 3 * d, y) !== M.AIR) g.world.set(x - 3 * d, y, M.COPPER); // not touching the vein
    const got = veinTiles(g, x, y);
    expect(got[0]).toEqual({ x, y });
    expect(got.some((t) => t.x === x - 3 * d)).toBe(false);
    expect(got).toEqual(vein);
    expect(veinTiles(g, x + 3 * d, y + 3)).toEqual([]);
  });
});
