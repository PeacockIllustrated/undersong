import { describe, expect, it } from 'vitest';
import { generateWorld } from '../src/world/generator';
import { World } from '../src/world/world';
import { M } from '../src/data/materials';
import { SKY_ROWS } from '../src/data/constants';

describe('generator', () => {
  it('is deterministic for the same seed', () => {
    const a = generateWorld(1234);
    const b = generateWorld(1234);
    expect(Buffer.from(a.mat).equals(Buffer.from(b.mat))).toBe(true);
    expect(a.carvings).toEqual(b.carvings);
    expect(a.objects).toEqual(b.objects);
  });

  it('differs between seeds', () => {
    const a = generateWorld(1);
    const b = generateWorld(2);
    expect(Buffer.from(a.mat).equals(Buffer.from(b.mat))).toBe(false);
  });

  it('places all twelve verse carvings on carving tiles', () => {
    const w = generateWorld(99);
    expect(w.carvings).toHaveLength(12);
    for (const c of w.carvings) expect(w.get(c.x, c.y)).toBe(M.CARVING);
    expect(new Set(w.carvings.map((c) => `${c.x},${c.y}`)).size).toBe(12);
  });

  it('has a grass line, bedrock walls and copper in Topsoil & Stone', () => {
    const w = generateWorld(5);
    expect(w.get(0, SKY_ROWS + 20)).toBe(M.BEDROCK);
    expect(w.get(w.w - 1, SKY_ROWS + 20)).toBe(M.BEDROCK);
    let copper = 0;
    for (let y = SKY_ROWS + 4; y < SKY_ROWS + 38; y++)
      for (let x = 1; x < w.w - 1; x++) if (w.get(x, y) === M.COPPER) copper++;
    expect(copper).toBeGreaterThan(20);
  });
});

describe('lighting', () => {
  it('matches canon §7 for a torch in a straight stone tunnel', () => {
    const w = new World(1, 128);
    w.mat.fill(M.STONE);
    w.surf.fill(0);
    const y = 40;
    for (let x = 10; x < 30; x++) w.mat[y * w.w + x] = M.AIR;
    w.objects[String(y * w.w + 10)] = 'torch';
    w.touchAll();
    const got = [0, 1, 2, 3, 4, 5].map((i) => Math.round(w.lightAt(10 + i, y) * 100) / 100);
    expect(got).toEqual([1, 0.92, 0.83, 0.75, 0.66, 0.58]);
    // through rock it falls off much faster
    expect(w.lightAt(10, y + 1)).toBeCloseTo(0.74, 2);
    expect(w.lightAt(10, y + 4)).toBe(0);
  });

  it('relights incrementally when a tile changes', () => {
    const w = new World(1, 128);
    w.mat.fill(M.STONE);
    w.surf.fill(0);
    const y = 40;
    w.mat[y * w.w + 20] = M.AIR;
    w.objects[String(y * w.w + 20)] = 'torch';
    w.touchAll();
    expect(w.lightAt(23, y)).toBeCloseTo(1 - 3 * 0.26, 4);
    w.set(21, y, M.AIR);
    w.set(22, y, M.AIR);
    w.set(23, y, M.AIR);
    expect(w.lightAt(23, y)).toBeCloseTo(1 - 3 * 0.085, 4);
  });
});
