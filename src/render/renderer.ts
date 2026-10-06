// Draws the world, objects, characters and light. Reads game state; never writes it. dev-bible §1.6
import { CHUNK, SHAFT_X, SKY_ROWS, TILE_PX } from '../data/constants';
import { LIGHT } from '../data/light';
import { M, MATERIALS, isMineable } from '../data/materials';
import { HEAT } from '../data/heat';
import { heatAt } from '../sim/heat';
import { reach } from '../sim/reach';
import { OBJECTS } from '../data/objects';
import { biomeAt } from '../data/biomes';
import type { Game } from '../sim/game';
import { digProgress } from '../sim/step';
import { hash3 } from '../sim/rng';
import type { World } from '../world/world';
import { tileTexture, wallTexture } from './tiles';
import { drawSprite } from './sprites';
import type { Camera } from './camera';
import { Fx } from './fx';
import { PESTS } from '../data/economy';
import { settings } from '../settings';
import { CAIRN, FIELDS, ROOTS, WOODLOT } from '../data/surface';
import { feasting, growing, isElder, treeStage } from '../sim/surface';

const T = TILE_PX;
const CPX = CHUNK * T;
/** Light blocks per tile edge: 4 gives 4-pixel steps, soft but still pixel art (ADR-018). */
const LIGHT_SUB = 4;
/** How fast displayed light chases the sim's light, per second. */
const LIGHT_EASE = 10;

/** Village buildings: sprite, tile x of the centre, and the building count that makes them appear. */
export const VILLAGE: readonly {
  sprite: string;
  x: number;
  key?: 'forge' | 'lampworks' | 'kiln' | 'songloom';
}[] = [
  { sprite: 'bunkhouse', x: 8 },
  { sprite: 'forge', x: 14, key: 'forge' },
  { sprite: 'lampworks', x: 20, key: 'lampworks' },
  { sprite: 'wren', x: 23, key: 'lampworks' },
  { sprite: 'kiln', x: 26, key: 'kiln' },
  { sprite: 'songloom', x: 32, key: 'songloom' },
  { sprite: 'headframe', x: SHAFT_X },
];

/** M6 Holloway above, render layout only: the cookhouse, the cairn, and where cottages stand in the back row. */
const COOKHOUSE_X = 36;
const CAIRN_X = 38;
const COTTAGE_X = [11, 5, 17, 29, 23, 47, 53, 35, 59, 1] as const;

/** Back wall shown behind dug-out tiles. */
function wallMaterial(d: number): number {
  const b = biomeAt(d).id;
  if (b <= 1) return d < 6 ? M.DIRT : M.STONE;
  if (b <= 3) return M.SLATE;
  if (b === 4) return M.SINGING;
  if (b === 5) return M.BASALT;
  return M.HEARTWALL;
}

function rgb(hex: string, k = 1): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${Math.round(((n >> 16) & 255) * k)},${Math.round(((n >> 8) & 255) * k)},${Math.round((n & 255) * k)})`;
}

interface ChunkCache {
  canvas: HTMLCanvasElement;
  version: number;
}

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private chunks = new Map<number, ChunkCache>();
  private light: HTMLCanvasElement;
  private lctx: CanvasRenderingContext2D;
  private lightImg: ImageData | null = null;
  readonly fx = new Fx();
  /** Dig path being drawn by the player. */
  preview: readonly { x: number; y: number }[] = [];
  /** The drag being drawn will cancel queued tiles rather than queue new ones. */
  previewCancel = false;
  /** A touch hold filling toward dig mode (0–1). */
  hold: { x: number; y: number; p: number } | null = null;
  /** A tile the foreman refused, flashed briefly. */
  refused: { x: number; y: number; until: number } | null = null;
  /** Device pixels per art pixel (whole number). */
  scale = 2;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.light = document.createElement('canvas');
    this.lctx = this.light.getContext('2d')!;
  }

  /** canon §6.3 / M0-04: ×2 below 600 css px, ×3 up to 1400, ×4 above; times the device ratio, rounded. */
  resize(cssW: number, cssH: number, dpr: number): void {
    const art = cssW < 600 ? 2 : cssW <= 1400 ? 3 : 4;
    this.scale = Math.max(1, Math.round(art * dpr));
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
  }

  /** Visible size in art pixels. */
  get viewW(): number {
    return this.canvas.width / this.scale;
  }
  get viewH(): number {
    return this.canvas.height / this.scale;
  }

  invalidate(): void {
    this.chunks.clear();
    this.dispW = null;
  }

  private chunkCanvas(w: World, cx: number, cy: number): HTMLCanvasElement {
    const id = cy * w.chunksX + cx;
    const ver = w.version[id] ?? 0;
    let c = this.chunks.get(id);
    if (c && c.version === ver) return c.canvas;
    if (!c) {
      const canvas = document.createElement('canvas');
      canvas.width = CPX;
      canvas.height = CPX;
      c = { canvas, version: -1 };
      this.chunks.set(id, c);
    }
    c.version = ver;
    this.paintChunk(w, cx, cy, c.canvas.getContext('2d')!);
    return c.canvas;
  }

  private paintChunk(w: World, cx: number, cy: number, g: CanvasRenderingContext2D): void {
    g.clearRect(0, 0, CPX, CPX);
    const x0 = cx * CHUNK;
    const y0 = cy * CHUNK;
    for (let ty = y0; ty < Math.min(w.h, y0 + CHUNK); ty++)
      for (let tx = x0; tx < Math.min(w.w, x0 + CHUNK); tx++) {
        const px = (tx - x0) * T;
        const py = (ty - y0) * T;
        const m = w.get(tx, ty);
        if (m === M.AIR) {
          if (ty > w.surf[tx]!) {
            const wall = wallTexture(wallMaterial(w.depth(ty)), tx, ty);
            if (wall) g.drawImage(wall, px, py);
            // soft shadow under the lip of the rock above
            if (w.get(tx, ty - 1) !== M.AIR) {
              g.fillStyle = 'rgba(6,8,18,0.35)';
              g.fillRect(px, py, T, 3);
            }
          }
          const lvl = w.water[ty * w.w + tx]!;
          if (lvl) {
            const hgt = Math.ceil((lvl / 8) * T);
            g.fillStyle = 'rgba(42,94,134,0.62)';
            g.fillRect(px, py + T - hgt, T, hgt);
            if (w.water[(ty - 1) * w.w + tx] === 0) {
              g.fillStyle = 'rgba(127,214,255,0.7)';
              g.fillRect(px, py + T - hgt, T, 1);
            }
          }
          continue;
        }
        const tex = tileTexture(m, tx, ty);
        if (tex) g.drawImage(tex, px, py);
        this.paintEdges(w, g, m, tx, ty, px, py);
      }
  }

  /** Edge highlight and shadow from neighbour air (dev-bible §4.2 rule 4). */
  private paintEdges(
    w: World,
    g: CanvasRenderingContext2D,
    m: number,
    tx: number,
    ty: number,
    px: number,
    py: number,
  ): void {
    const def = MATERIALS[m]!;
    const host = def.host !== undefined ? MATERIALS[def.host]! : def;
    const [, light, dark] = host.ramp;
    const up = w.get(tx, ty - 1) === M.AIR;
    const dn = w.get(tx, ty + 1) === M.AIR;
    const lf = w.get(tx - 1, ty) === M.AIR;
    const rt = w.get(tx + 1, ty) === M.AIR;
    if (m === M.GRASS || (m === M.DIRT && up && ty <= w.surf[tx]! + 1)) {
      // a grass cap with tufts
      const v = hash3(tx, ty, 3);
      g.fillStyle = '#4F9A3A';
      g.fillRect(px, py, T, 4);
      g.fillStyle = '#6CC04A';
      g.fillRect(px, py, T, 2);
      g.fillStyle = '#3A7A2C';
      for (let i = 0; i < 4; i++)
        g.fillRect(px + ((i * 5 + Math.floor(v * 7)) % 15), py + 4, 1, 1 + ((i + tx) % 2));
      if (up) {
        g.fillStyle = '#6CC04A';
        for (let i = 0; i < 3; i++) g.fillRect(px + ((i * 6 + Math.floor(v * 11)) % 15), py - 1, 1, 1);
      }
      return;
    }
    g.fillStyle = rgb(light);
    if (up) g.fillRect(px, py, T, 1);
    if (lf) g.fillRect(px, py, 1, T);
    g.fillStyle = rgb(dark, 0.8);
    if (dn) g.fillRect(px, py + T - 2, T, 2);
    if (rt) g.fillRect(px + T - 1, py, 1, T);
  }

  draw(game: Game, cam: Camera, now: number): void {
    const { ctx } = this;
    const s = this.scale;
    const w = game.world;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const camX = Math.round(cam.x * s) / s;
    const camY = Math.round(cam.y * s) / s;

    this.drawSky(camY);
    const sh = now < this.fx.shakeUntil ? this.fx.shakeAmp * s : 0;
    const shx = sh ? Math.round(Math.sin(now / 17) * sh) : 0;
    ctx.setTransform(s, 0, 0, s, -camX * s + shx, -camY * s);

    // village behind the ground line
    this.drawVillage(game, now);

    // tiles, by chunk cache
    const cx0 = Math.max(0, Math.floor(camX / CPX));
    const cy0 = Math.max(0, Math.floor(camY / CPX));
    const cx1 = Math.min(w.chunksX - 1, Math.floor((camX + this.viewW) / CPX));
    const cy1 = Math.min(w.chunksY - 1, Math.floor((camY + this.viewH) / CPX));
    for (let cy = cy0; cy <= cy1; cy++)
      for (let cx = cx0; cx <= cx1; cx++) ctx.drawImage(this.chunkCanvas(w, cx, cy), cx * CPX, cy * CPX);

    const tx0 = Math.max(0, Math.floor(camX / T));
    const ty0 = Math.max(0, Math.floor(camY / T));
    const tx1 = Math.min(w.w - 1, Math.ceil((camX + this.viewW) / T));
    const ty1 = Math.min(w.h - 1, Math.ceil((camY + this.viewH) / T));
    const frame = Math.floor(now / 110);

    this.drawRoots(game, tx0, ty0, tx1, ty1, now);
    // M6-07: the root cellar under the cookhouse, cut away in the cross-section (drawn over the soil)
    const cellar = game.state.surface.cellar;
    if (cellar > 0)
      drawSprite(
        ctx,
        'cellar',
        cellar - 1,
        COOKHOUSE_X * T + T / 2,
        ((w.surf[COOKHOUSE_X] ?? SKY_ROWS) + 1) * T,
      );
    this.drawCarvings(game, tx0, ty0, tx1, ty1, frame);
    this.drawObjects(w, tx0, ty0, tx1, ty1, frame);
    this.drawVillagers(game, now);
    this.drawDigging(game, frame, now);
    this.drawForeman(game, now);
    this.fx.drawWorld(ctx, now);

    this.drawLight(w, tx0, ty0, tx1, ty1, now);
    this.drawHeat(game, tx0, ty0, tx1, ty1, now);
    this.fx.drawOverlay(ctx, now);
  }

  private drawSky(camY: number): void {
    const { ctx } = this;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const s = this.scale;
    // sky gradient, then the far hills, then underground black where the sky would show through
    const horizon = (SKY_ROWS * T - camY) * s;
    const g = ctx.createLinearGradient(0, horizon - 220 * s, 0, horizon);
    g.addColorStop(0, '#3B6E9C');
    g.addColorStop(0.6, '#5AA8DA');
    g.addColorStop(1, '#BFE6F5');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (horizon > 0) {
      for (const [k, col, amp, par] of [
        [0.11, '#8FBFDF', 34, 0.25],
        [0.19, '#3A7A2C', 20, 0.5],
      ] as const) {
        ctx.fillStyle = col;
        const step = 4 * s;
        for (let x = 0; x < W; x += step) {
          const u = (x / s) * par;
          const hgt =
            (Math.sin(u * k * 0.3) * 0.5 + Math.sin(u * k * 0.11 + 2) * 0.5 + 1) * amp * 0.5 + amp * 0.4;
          const top = Math.round(horizon - hgt * s * 2);
          ctx.fillRect(x, top, step, Math.max(0, H - top));
        }
      }
    }
    ctx.fillStyle = '#141A33';
    if (horizon < H) ctx.fillRect(0, Math.max(0, horizon + 4 * T * s), W, H);
  }

  private drawVillage(game: Game, now: number): void {
    const frame = Math.floor(now / 160);
    const surfY = (x: number): number => (game.world.surf[Math.floor(x)] ?? SKY_ROWS) * T;
    const sf = game.state.surface;
    // cottages stand in a back row, a little up the slope behind the street
    const cottages = Math.min(sf.wood.cottage, COTTAGE_X.length);
    for (let i = 0; i < cottages; i++) {
      const x = COTTAGE_X[i]!;
      drawSprite(this.ctx, 'cottage', i, x * T + T / 2, surfY(x) - 5);
    }
    for (const b of VILLAGE) {
      if (b.key && game.state.buildings[b.key] <= 0) continue;
      drawSprite(this.ctx, b.sprite, frame, b.x * T + T / 2, surfY(b.x));
    }
    this.drawSurface(game, now, surfY);
  }

  /** M6: the fields, the woodlot, the cookhouse and the cairn, and the two who work them. */
  private drawSurface(game: Game, now: number, surfY: (x: number) => number): void {
    const s = game.state;
    const sf = s.surface;
    const ctx = this.ctx;
    // the woodlot: an empty slot shows a stump once Rook is here, and a wild tree before
    for (let k = 0; k < WOODLOT.slots.length; k++) {
      const x = WOODLOT.slots[k]!;
      const px = (x + 0.5) * T;
      const t = sf.trees.find((tr) => tr.slot === k);
      if (!t) {
        if (sf.rook) drawSprite(ctx, 'tree-stump', 0, px, surfY(x));
        else if (k % 2 === 0) drawSprite(ctx, 'tree', 0, px, surfY(x));
        continue;
      }
      const st = treeStage(t);
      const name = isElder(t) ? 'tree-elder' : ['tree-sapling', 'tree-young', 'tree', 'tree'][st]!;
      drawSprite(ctx, name, 0, px, surfY(x));
      if (isElder(t) && Math.floor(now / 140 + k) % 9 === 0)
        this.fx.sparkle(px - 12 + ((now / 37 + k * 11) % 24), surfY(x) - 40 + ((now / 53) % 20), '#FFF2A8');
      // an old tree ready to fell shows a small axe mark
      if (!isElder(t) && st >= WOODLOT.stageS.length && Math.floor(now / 400) % 2 === 0)
        this.markReady(px, surfY(x) - 50);
    }
    if (sf.tansy) {
      drawSprite(
        ctx,
        'cookhouse',
        feasting(s) ? Math.floor(now / 200) : 0,
        COOKHOUSE_X * T + T / 2,
        surfY(COOKHOUSE_X),
      );
      // the fields
      sf.plots.forEach((p, i) => {
        const x = FIELDS.plotX0 + i;
        const f =
          p.t >= 1 ? (p.golden ? 4 : 3) : p.crop && !growing(s, i) ? 4 : Math.min(2, Math.floor(p.t * 3));
        drawSprite(ctx, `crop-${p.crop ?? 'barley'}`, f, x * T + T / 2, surfY(x));
        if (p.golden && Math.floor(now / 120 + i) % 5 === 0)
          this.fx.sparkle(x * T + 2 + ((now / 40) % 12), surfY(x) - 12, '#FFF2A8');
      });
      // Tansy walks the rows when her hands are hired, else waits by the cookhouse
      const n = Math.max(1, sf.plots.length);
      const walk = s.helpers.tansy ? (Math.sin(now / 2600) * 0.5 + 0.5) * (n - 1) : -1;
      const tx = s.helpers.tansy ? FIELDS.plotX0 + walk : FIELDS.plotX0 - 0.7;
      const facing = !!s.helpers.tansy && Math.cos(now / 2600) < 0;
      drawSprite(ctx, 'tansy', Math.floor(now / 700) % 2, tx * T + T / 2, surfY(tx) - 1, facing);
    }
    if (sf.rook) {
      // Rook stands by the eastern woodlot
      const rx = WOODLOT.slots[2]! - 1.2;
      drawSprite(ctx, 'rook', Math.floor(now / 760) % 2, rx * T + T / 2, surfY(rx) - 1, true);
    }
    if (s.stats.caveIns > 0)
      drawSprite(
        ctx,
        'cairn',
        Math.min(s.stats.caveIns, CAIRN.stones) - 1,
        CAIRN_X * T + T / 2,
        surfY(CAIRN_X),
      );
  }

  /** A small white tick over an old tree: it is ready to fell. */
  private markReady(x: number, y: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#141A33';
    ctx.fillRect(x - 3, y - 1, 7, 6);
    ctx.fillStyle = '#E8F4F0';
    for (const [dx, dy] of [
      [-2, 2],
      [-1, 3],
      [0, 2],
      [1, 1],
      [2, 0],
    ] as const)
      ctx.fillRect(x + dx, y + dy, 1, 1);
  }

  /** canon §17.4: an elder's roots run through the rock; copper and tin near them glint. */
  private drawRoots(game: Game, tx0: number, ty0: number, tx1: number, ty1: number, now: number): void {
    const w = game.world;
    if (!w.soft.size) return;
    const ctx = this.ctx;
    const r = ROOTS.glintRange;
    for (const i of w.soft) {
      const x = i % w.w;
      const y = Math.floor(i / w.w);
      if (x < tx0 - r || x > tx1 + r || y < ty0 - r || y > ty1 + r) continue;
      if (x >= tx0 && x <= tx1 && y >= ty0 && y <= ty1 && isMineable(w.get(x, y))) {
        // a root: a dark twisting line through the tile
        const v = hash3(x, y, 77);
        ctx.fillStyle = '#3A2A20';
        for (let k = 0; k < T; k += 2)
          ctx.fillRect(x * T + 6 + Math.round(Math.sin(k / 3 + v * 6) * 3), y * T + k, 2, 2);
        ctx.fillStyle = '#6B4329';
        ctx.fillRect(x * T + 4 + Math.round(v * 6), y * T + 9, 3, 1);
      }
      if (Math.floor(now / 100 + x * 7 + y) % 23 !== 0) continue;
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const m = w.get(x + dx, y + dy);
          if (m === M.COPPER || m === M.TIN) this.fx.sparkle((x + dx) * T + 8, (y + dy) * T + 8, '#FFF2A8');
        }
    }
  }

  private drawCarvings(game: Game, tx0: number, ty0: number, tx1: number, ty1: number, frame: number): void {
    for (const c of game.world.carvings) {
      if (c.x < tx0 || c.x > tx1 || c.y < ty0 || c.y > ty1) continue;
      if (!game.state.verses.run[c.verse]) continue;
      drawSprite(this.ctx, 'carving', 1, c.x * T + T / 2, c.y * T + T - 1);
      if (frame % 8 === 0) this.fx.sparkle(c.x * T + T / 2, c.y * T + 4, '#FFF2A8');
    }
  }

  private drawObjects(w: World, tx0: number, ty0: number, tx1: number, ty1: number, frame: number): void {
    for (const [k, kind] of Object.entries(w.objects)) {
      const i = Number(k);
      const x = i % w.w;
      const y = Math.floor(i / w.w);
      if (x < tx0 || x > tx1 || y < ty0 || y > ty1) continue;
      drawSprite(this.ctx, OBJECTS[kind].sprite, frame + x, x * T + T / 2, y * T + T - 1);
    }
  }

  private drawDigging(game: Game, frame: number, now: number): void {
    const f = game.state.foreman;
    const { ctx } = this;
    if (f.target) {
      const p = digProgress(game);
      const stage = Math.min(2, Math.floor(p * 3));
      const x = f.target.x * T;
      const y = f.target.y * T;
      ctx.fillStyle = 'rgba(20,26,51,0.85)';
      // three crack stages, growing from the centre
      const cracks: readonly (readonly [number, number, number, number])[] = [
        [7, 5, 1, 4],
        [8, 8, 3, 1],
        [5, 9, 2, 1],
        [10, 3, 1, 3],
        [4, 4, 2, 1],
        [11, 10, 1, 3],
        [6, 11, 1, 3],
        [2, 7, 3, 1],
        [12, 6, 2, 1],
      ];
      for (let i = 0; i < 3 * (stage + 1); i++) {
        const c = cracks[i]!;
        ctx.fillRect(x + c[0], y + c[1], c[2], c[3]);
      }
      ctx.strokeStyle = frame % 4 < 2 ? 'rgba(255,214,90,0.9)' : 'rgba(255,242,168,0.9)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
      // a progress bar along the bottom of the tile being dug
      ctx.fillStyle = 'rgba(20,26,51,0.85)';
      ctx.fillRect(x + 2, y + T - 4, T - 4, 2);
      ctx.fillStyle = '#FFD65A';
      ctx.fillRect(x + 2, y + T - 4, Math.round((T - 4) * p), 2);
    }
    // dig order: a dotted thread from tile to tile, and each queued tile numbered
    if (f.queue.length) {
      ctx.fillStyle = 'rgba(255,214,90,0.5)';
      let prev = f.target ?? null;
      for (const q of f.queue) {
        if (prev) {
          const steps = Math.max(Math.abs(q.x - prev.x), Math.abs(q.y - prev.y)) * 4;
          for (let k = 1; k < steps; k += 2) {
            const ax = (prev.x + ((q.x - prev.x) * k) / steps) * T + T / 2;
            const ay = (prev.y + ((q.y - prev.y) * k) / steps) * T + T / 2;
            ctx.fillRect(Math.round(ax), Math.round(ay), 1, 1);
          }
        }
        prev = q;
      }
    }
    ctx.strokeStyle = 'rgba(255,214,90,0.55)';
    f.queue.forEach((q, i) => {
      ctx.strokeRect(q.x * T + 2.5, q.y * T + 2.5, T - 5, T - 5);
      if (i < 99) drawNumber(ctx, i + 1, q.x * T + T / 2, q.y * T + 5);
    });
    ctx.strokeStyle = this.previewCancel ? 'rgba(224,83,47,0.9)' : 'rgba(95,240,216,0.8)';
    for (const q of this.preview) {
      ctx.strokeRect(q.x * T + 1.5, q.y * T + 1.5, T - 3, T - 3);
      if (this.previewCancel) {
        ctx.beginPath();
        ctx.moveTo(q.x * T + 4, q.y * T + 4);
        ctx.lineTo(q.x * T + T - 4, q.y * T + T - 4);
        ctx.stroke();
      }
    }
    const h = this.hold;
    if (h && h.p > 0.1) {
      // a ring that fills during the hold before a drag digs
      ctx.strokeStyle = 'rgba(95,240,216,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(h.x * T + T / 2, h.y * T + T / 2, T * 0.75, -Math.PI / 2, -Math.PI / 2 + h.p * Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    const r = this.refused;
    if (r && now < r.until) {
      const dx = Math.round(Math.sin(now / 20) * 2);
      ctx.strokeStyle = 'rgba(224,83,47,0.9)';
      ctx.strokeRect(r.x * T + 0.5 + dx, r.y * T + 0.5, T - 1, T - 1);
    }
  }

  private drawVillagers(game: Game, now: number): void {
    const s = game.state;
    for (const m of s.miners) {
      const working = m.target && m.stalledBy === null;
      const f = working ? 2 + (Math.floor(now / 120 + m.id) % 3) : Math.floor(now / 700 + m.id) % 2;
      drawSprite(this.ctx, 'miner', f, m.x * T + T / 2, m.y * T + T - 1, !!m.target && m.target.x < m.x);
      const ctx = this.ctx;
      if (working && m.target) {
        // teal corner brackets on the face a miner is working
        const x = m.target.x * T;
        const y = m.target.y * T;
        ctx.fillStyle = 'rgba(95,240,216,0.7)';
        for (const [cx, cy, dx, dy] of [
          [0, 0, 1, 1],
          [T - 1, 0, -1, 1],
          [0, T - 1, 1, -1],
          [T - 1, T - 1, -1, -1],
        ] as const) {
          ctx.fillRect(x + cx + (dx < 0 ? -2 : 0), y + cy, 3, 1);
          ctx.fillRect(x + cx, y + cy + (dy < 0 ? -2 : 0), 1, 3);
        }
        // M5-02: a face too dark to work well also gets a shape, not just a dimmer colour
        if (settings().marks && game.world.faceLight(m.target.x, m.target.y) < PESTS.darkBelow)
          this.markDark(x + T / 2 - 2, y - 7);
      } else if (m.stalledBy !== null && Math.floor(now / 300) % 2 === 0) {
        // a stopped miner shows an orange "!" over their head
        const x = m.x * T + T / 2 - 1;
        const y = m.y * T - 12;
        ctx.fillStyle = '#141A33';
        ctx.fillRect(x - 1, y - 1, 4, 9);
        ctx.fillStyle = '#FF9A3C';
        ctx.fillRect(x, y, 2, 4);
        ctx.fillRect(x, y + 5, 2, 2);
      }
    }
    for (const p of s.pests)
      drawSprite(this.ctx, p.kind, Math.floor(now / 160 + p.id), p.x * T + T / 2, p.y * T + T - 1);
    for (const gl of s.glints) {
      if (Math.floor(now / 90) % 3 === 0)
        this.fx.sparkle(gl.x * T + 4 + ((now / 50) % 8), gl.y * T + 6, '#B9FFF3');
    }
  }

  /** A small crescent moon on a dark outline: this face is too dark for full speed. */
  private markDark(x: number, y: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#141A33';
    ctx.fillRect(x - 1, y - 1, 6, 7);
    ctx.fillStyle = '#B9FFF3';
    for (const [dx, dy, w] of [
      [1, 0, 3],
      [0, 1, 2],
      [0, 2, 1],
      [0, 3, 2],
      [1, 4, 3],
    ] as const)
      ctx.fillRect(x + dx, y + dy, w, 1);
  }

  /** canon §15: faces too hot to work shimmer; slowed ones glow faintly. Drawn over the dark so heat reads unlit. */
  private drawHeat(game: Game, tx0: number, ty0: number, tx1: number, ty1: number, now: number): void {
    const w = game.world;
    if (w.depth(ty1) < HEAT.fromD - HEAT.hotR) return;
    const ctx = this.ctx;
    const r = reach(game);
    for (let y = Math.max(ty0, SKY_ROWS + HEAT.fromD - HEAT.hotR); y <= ty1; y++)
      for (let x = tx0; x <= tx1; x++) {
        const i = y * w.w + x;
        if (!isMineable(w.mat[i]!) || !(r[i - 1] || r[i + 1] || r[i - w.w] || r[i + w.w])) continue;
        const h = heatAt(game, x, y);
        if (h < HEAT.slowAt) continue;
        const hot = h >= HEAT.stopAt;
        // a glowing rim on each side that faces the open mine
        ctx.fillStyle = hot ? '#E0532F' : '#FF9A3C';
        ctx.globalAlpha = hot ? 0.75 : 0.45;
        if (r[i - 1]) ctx.fillRect(x * T, y * T, 2, T);
        if (r[i + 1]) ctx.fillRect(x * T + T - 2, y * T, 2, T);
        if (r[i - w.w]) ctx.fillRect(x * T, y * T, T, 2);
        if (r[i + w.w]) ctx.fillRect(x * T, y * T + T - 2, T, 2);
        if (hot && settings().marks) {
          // M5-02: too hot to work also reads by shape: a dark badge with three heat waves
          ctx.globalAlpha = 1;
          const bx = x * T + T / 2 - 4;
          const by = y * T + T / 2 - 4;
          ctx.fillStyle = '#141A33';
          ctx.fillRect(bx, by, 9, 8);
          ctx.fillStyle = '#FF9A3C';
          for (let k = 0; k < 3; k++)
            for (let j = 0; j < 6; j++) ctx.fillRect(bx + 1 + k * 3 + (j % 2), by + 1 + j, 1, 1);
        }
        if (hot) {
          // rising haze: two pixels climbing the face
          ctx.globalAlpha = 0.8;
          ctx.fillStyle = '#FF9A3C';
          const k = Math.floor(now / 120 + x * 3 + y * 5) % T;
          ctx.fillRect(x * T + ((x + y) % 4) + 1, y * T + T - 1 - k, 1, 1);
          ctx.fillRect(x * T + ((x * 7 + y) % 4) + 4, y * T + T - 1 - ((k + 4) % T), 1, 1);
        }
      }
    ctx.globalAlpha = 1;
  }

  /** Foreman position eases toward the sim position, so steps read as walking. */
  private fx0 = { x: SHAFT_X * T + T / 2, y: SKY_ROWS * T + T - 1, flip: false };
  private drawForeman(game: Game, now: number): void {
    const f = game.state.foreman;
    this.lampX = this.fx0.x / T;
    this.lampY = this.fx0.y / T - 0.8;
    const tx = f.x * T + T / 2;
    const ty = f.y * T + T - 1;
    const p = this.fx0;
    const dx = tx - p.x;
    const dy = ty - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist > T * 12) {
      p.x = tx;
      p.y = ty;
    } else if (dist > 0.5) {
      const k = Math.min(1, 6 / dist);
      p.x += dx * k;
      p.y += dy * k;
    }
    if (f.target) p.flip = f.target.x < f.x;
    const swing = f.target ? 2 + (Math.floor(now / 90) % 3) : Math.floor(now / 600) % 2;
    drawSprite(this.ctx, 'foreman', swing, Math.round(p.x), Math.round(p.y), p.flip);
  }

  /**
   * canon §7: darkness overlay and tints. Smooth lighting (ADR-018): the sim's per-tile light is
   * eased over time, then sampled bilinearly between tile centres at LIGHT_SUB blocks per tile, so
   * light falls off in soft steps instead of whole-tile squares. Render only; the sim never sees it.
   */
  private lampX = 0;
  private lampY = 0;
  private dispW: Float32Array | null = null;
  private dispC: Float32Array | null = null;
  private lastLight = 0;
  private drawLight(w: World, tx0: number, ty0: number, tx1: number, ty1: number, now: number): void {
    const cw = tx1 - tx0 + 1;
    const ch = ty1 - ty0 + 1;
    const S = LIGHT_SUB;
    if (this.light.width !== cw * S || this.light.height !== ch * S) {
      this.light.width = cw * S;
      this.light.height = ch * S;
      this.lightImg = this.lctx.createImageData(cw * S, ch * S);
    }
    for (
      let cy = Math.floor(Math.max(0, ty0 - 1) / CHUNK);
      cy <= Math.floor(Math.min(w.h - 1, ty1 + 1) / CHUNK);
      cy++
    )
      for (
        let cx = Math.floor(Math.max(0, tx0 - 1) / CHUNK);
        cx <= Math.floor(Math.min(w.w - 1, tx1 + 1) / CHUNK);
        cx++
      )
        w.ensureLightChunk(cx, cy);

    // ease the displayed light toward the sim's light, so lamps fade in and out
    const n = w.w * w.h;
    let snap = false;
    if (!this.dispW || this.dispW.length !== n) {
      this.dispW = new Float32Array(n);
      this.dispC = new Float32Array(n);
      snap = true;
    }
    const dt = Math.min(0.25, Math.max(0, (now - this.lastLight) / 1000));
    this.lastLight = now;
    const k = snap ? 1 : 1 - Math.exp(-dt * LIGHT_EASE);
    const dW = this.dispW;
    const dC = this.dispC!;
    // margin of one tile so every sample has neighbours to blend with
    const mx0 = Math.max(0, tx0 - 1);
    const my0 = Math.max(0, ty0 - 1);
    const mx1 = Math.min(w.w - 1, tx1 + 1);
    const my1 = Math.min(w.h - 1, ty1 + 1);
    for (let y = my0; y <= my1; y++)
      for (let x = mx0; x <= mx1; x++) {
        const i = y * w.w + x;
        // the sky is fully lit, so the grass line blends into daylight
        const tw = y < w.surf[x]! ? 1 : w.warm[i]!;
        const tc = y < w.surf[x]! ? 0 : w.cool[i]!;
        dW[i] = dW[i]! + (tw - dW[i]!) * k;
        dC[i] = dC[i]! + (tc - dC[i]!) * k;
      }

    const img = this.lightImg!;
    const d = img.data;
    const IW = cw * S;
    const flick = 1 + Math.sin(now / 95) * LIGHT.flicker * 0.5 + Math.sin(now / 37) * LIGHT.flicker * 0.5;
    const sample = (arr: Float32Array, fx: number, fy: number): number => {
      // bilinear between tile centres, clamped to the margin
      const x0 = Math.min(mx1, Math.max(mx0, Math.floor(fx)));
      const y0 = Math.min(my1, Math.max(my0, Math.floor(fy)));
      const x1 = Math.min(mx1, x0 + 1);
      const y1 = Math.min(my1, y0 + 1);
      const ax = Math.min(1, Math.max(0, fx - x0));
      const ay = Math.min(1, Math.max(0, fy - y0));
      const top = arr[y0 * w.w + x0]! * (1 - ax) + arr[y0 * w.w + x1]! * ax;
      const bot = arr[y1 * w.w + x0]! * (1 - ax) + arr[y1 * w.w + x1]! * ax;
      return top * (1 - ay) + bot * ay;
    };
    for (let sy = 0; sy < ch * S; sy++) {
      const py = ty0 + (sy + 0.5) / S; // world position in tiles
      const ty = Math.floor(py);
      for (let sx = 0; sx < IW; sx++) {
        const px = tx0 + (sx + 0.5) / S;
        const tx = Math.floor(px);
        const o = (sy * IW + sx) * 4;
        if (ty < w.surf[tx]!) {
          d[o + 3] = 0;
          continue;
        }
        // the Foreman's own lamp: render-only, so the player can always see where they are digging (ADR-010)
        const ld = Math.hypot(px - this.lampX, py - this.lampY);
        const lamp = Math.max(0, LIGHT.foremanLamp - ld * LIGHT.decayAir * 1.6);
        const warm = Math.max(sample(dW, px - 0.5, py - 0.5), lamp) * flick;
        const cool = sample(dC, px - 0.5, py - 0.5);
        const L = Math.min(1, warm + cool);
        // darkness over everything, tinted toward whichever light reaches it
        const a = (1 - L) * LIGHT.darkness;
        const ct = Math.min(1, cool) * LIGHT.coolTint;
        const wt = Math.min(1, warm) * LIGHT.warmTint;
        const tA = ct + wt;
        const outA = a + tA * (1 - a);
        if (outA <= 0.001) {
          d[o + 3] = 0;
          continue;
        }
        const tr = tA > 0 ? (70 * ct + 255 * wt) / tA : 0;
        const tg = tA > 0 ? (230 * ct + 170 * wt) / tA : 0;
        const tb = tA > 0 ? (220 * ct + 70 * wt) / tA : 0;
        d[o] = (6 * a + tr * tA * (1 - a)) / outA;
        d[o + 1] = (8 * a + tg * tA * (1 - a)) / outA;
        d[o + 2] = (18 * a + tb * tA * (1 - a)) / outA;
        d[o + 3] = outA * 255;
      }
    }
    this.lctx.putImageData(img, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.light, tx0 * T, ty0 * T, cw * T, ch * T);
  }
}

/** 3×5 pixel digits, so queue numbers stay crisp at any zoom. */
const DIGITS = [
  '111101101101111',
  '010110010010111',
  '111001111100111',
  '111001111001111',
  '101101111001001',
  '111100111001111',
  '111100111101111',
  '111001001001001',
  '111101111101111',
  '111101111001111',
];

/** Draw n centred at (cx, top) in pale gold on a dark backing. */
function drawNumber(ctx: CanvasRenderingContext2D, n: number, cx: number, top: number): void {
  const str = String(n);
  const w = str.length * 4 - 1;
  const x0 = Math.round(cx - w / 2);
  ctx.fillStyle = 'rgba(20,26,51,0.8)';
  ctx.fillRect(x0 - 1, top - 1, w + 2, 7);
  ctx.fillStyle = '#FFF2A8';
  for (let c = 0; c < str.length; c++) {
    const g = DIGITS[Number(str[c])]!;
    for (let i = 0; i < 15; i++)
      if (g[i] === '1') ctx.fillRect(x0 + c * 4 + (i % 3), top + Math.floor(i / 3), 1, 1);
  }
}
