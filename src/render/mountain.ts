// M7-05: the Mountain view. The whole cross-section, fields to the deepest worker, one flat colour per tile.
// Each tile is a whole number of device pixels (ADR-032): no sprites, no smoothing, nothing fractional.
import { MOUNTAIN } from '../data/touch';
import { M, MATERIALS } from '../data/materials';
import { SKY_ROWS } from '../data/constants';
import { BIOMES } from '../data/biomes';
import type { Game } from '../sim/game';

const SKY = '#7FD6FF';
const DUG = '#141A33';
const BURIED = '#373A52';
const WATER = '#2A5E86';
const MINER = '#FFD65A';
const FOREMAN = '#5FF0D8';

export interface MountainLayout {
  /** Device px of the map's top left, device px per tile, and the first row shown. */
  ox: number;
  oy: number;
  k: number;
  y0: number;
  rows: number;
}

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export class MountainView {
  private buf = document.createElement('canvas');
  private bctx = this.buf.getContext('2d')!;
  private at = -1e9;
  layout: MountainLayout | null = null;

  /** The rows to show: a little sky, down past the deepest worker or the deepest dug tile. */
  span(game: Game): { y0: number; y1: number } {
    const { world: w, state: s } = game;
    let top = w.h;
    for (let x = 0; x < w.w; x++) top = Math.min(top, w.surf[x]!);
    let deep = Math.floor(s.foreman.y);
    for (const m of s.miners) deep = Math.max(deep, Math.floor(m.y));
    deep = Math.max(deep, SKY_ROWS + s.stats.maxDepthD);
    return { y0: Math.max(0, top - MOUNTAIN.sky), y1: Math.min(w.h - 1, deep + MOUNTAIN.below) };
  }

  draw(ctx: CanvasRenderingContext2D, game: Game, W: number, H: number, dpr: number, now: number): void {
    const { world: w, state: s } = game;
    const { y0, y1 } = this.span(game);
    const rows = y1 - y0 + 1;
    if (now - this.at > MOUNTAIN.redrawMs || this.buf.width !== w.w || this.buf.height !== rows) {
      this.at = now;
      this.buf.width = w.w;
      this.buf.height = rows;
      const img = this.bctx.createImageData(w.w, rows);
      const d = img.data;
      const cols = new Map<number, [number, number, number]>();
      const col = (m: number): [number, number, number] => {
        let c = cols.get(m);
        if (!c) cols.set(m, (c = hex(MATERIALS[m]?.ramp[0] ?? BURIED)));
        return c;
      };
      const sky = hex(SKY);
      const dug = hex(DUG);
      const buried = hex(BURIED);
      const water = hex(WATER);
      for (let r = 0; r < rows; r++)
        for (let x = 0; x < w.w; x++) {
          const y = y0 + r;
          const m = w.get(x, y);
          let c: [number, number, number];
          if (m === M.AIR) c = y < w.surf[x]! ? sky : game.wet.has(w.idx(x, y)) ? water : dug;
          // only faces the village has opened are shown in their own colour; the rest keeps its secrets
          else c = w.exposed(x, y) || y < w.surf[x]! + 1 ? col(m) : buried;
          const i = (r * w.w + x) * 4;
          d[i] = c[0];
          d[i + 1] = c[1];
          d[i + 2] = c[2];
          d[i + 3] = 255;
        }
      const dot = (fx: number, fy: number, c: [number, number, number]): void => {
        const x = Math.floor(fx);
        const r = Math.floor(fy) - y0;
        if (x < 0 || x >= w.w || r < 0 || r >= rows) return;
        const i = (r * w.w + x) * 4;
        d[i] = c[0];
        d[i + 1] = c[1];
        d[i + 2] = c[2];
      };
      const mc = hex(MINER);
      for (const m of s.miners) dot(m.x, m.y, mc);
      dot(s.foreman.x, s.foreman.y, hex(FOREMAN));
      this.bctx.putImageData(img, 0, 0);
    }
    // on a wide screen the HUD keeps to the corners, so the map can use the full height
    const wide = W / dpr >= MOUNTAIN.wideCss;
    const top = (wide ? MOUNTAIN.padWide : MOUNTAIN.padTop) * dpr;
    const avail = Math.max(1, H - top - (wide ? MOUNTAIN.padWide : MOUNTAIN.padBottom) * dpr);
    const k = Math.max(1, Math.floor(Math.min(W / w.w, avail / rows)));
    const ox = Math.floor((W - w.w * k) / 2);
    const oy = Math.floor(top + Math.max(0, (avail - rows * k) / 2));
    this.layout = { ox, oy, k, y0, rows };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = DUG;
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(this.buf, ox, oy, w.w * k, rows * k);
    // where each biome begins, named down the left edge of the map
    ctx.font = `${Math.round(11 * dpr)}px 'Pixelify Sans', sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const b of BIOMES) {
      const r = SKY_ROWS + Math.max(0, b.d0) - y0;
      if (b.d0 < 0 || r < 0 || r >= rows) continue;
      const y = oy + r * k;
      ctx.fillStyle = '#5F6487';
      ctx.fillRect(ox - 6 * dpr, y, 4 * dpr, Math.max(1, Math.round(dpr)));
      ctx.fillStyle = '#E8F4F0';
      ctx.fillText(b.name, ox - 10 * dpr, y);
    }
  }

  /** The tile under a device-pixel point, or null off the map. */
  tileAt(px: number, py: number, worldW: number): { x: number; y: number } | null {
    const l = this.layout;
    if (!l) return null;
    const x = Math.floor((px - l.ox) / l.k);
    const r = Math.floor((py - l.oy) / l.k);
    if (x < 0 || x >= worldW || r < 0 || r >= l.rows) return null;
    return { x, y: l.y0 + r };
  }
}
