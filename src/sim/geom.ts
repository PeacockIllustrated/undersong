// Small tile geometry helpers shared by input, tools and the sim.
import type { Tile } from './state';

/** Tiles on a 4-connected line from a to b (both inclusive), so a dragged path is always diggable in order. */
export function line4(a: Tile, b: Tile): Tile[] {
  const out: Tile[] = [];
  let { x, y } = a;
  out.push({ x, y });
  const dx = Math.abs(b.x - x);
  const dy = Math.abs(b.y - y);
  const sx = Math.sign(b.x - x);
  const sy = Math.sign(b.y - y);
  let e = 0;
  for (let i = 0; i < dx + dy; i++) {
    if (dy === 0 || (dx !== 0 && 2 * (e + dy) < dx)) {
      x += sx;
      e += dy;
    } else {
      y += sy;
      e -= dx;
    }
    out.push({ x, y });
  }
  return out;
}
