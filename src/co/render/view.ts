// Draws a day underground: sky by the clock, the village, the mine, the crews, the Foreman and the dark.
// Reads the game; never writes it. Reuses Undersong's tile textures, sprites and light (dev-bible §1.5).
import { CHUNK, SHAFT_X, SKY_ROWS, TILE_PX } from '../../data/constants';
import { LIGHT } from '../../data/light';
import { M, MATERIALS } from '../../data/materials';
import { biomeAt } from '../../data/biomes';
import { hash3 } from '../../sim/rng';
import type { World } from '../../world/world';
import { drawSprite } from '../../render/sprites';
import { tileTexture, wallTexture } from '../../render/tiles';
import { BODY, DAY } from '../data/co';
import { aimTile } from '../sim/day';
import { shaftFoot } from '../sim/mine';
import { shaftDepth } from '../sim/stats';
import type { Control } from '../sim/body';
import type { Game } from '../sim/state';
import { Fx } from './fx';

const T = TILE_PX;
const CPX = CHUNK * T;
const LIGHT_SUB = 4;

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

const mix = (a: string, b: string, t: number): string => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number): number => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};

/** Sky colours through the day: [top, horizon] at dawn, noon, late afternoon and dusk. */
const SKY = [
  [0, '#3B6E9C', '#F2A35E'],
  [0.15, '#3B6E9C', '#BFE6F5'],
  [0.7, '#5AA8DA', '#BFE6F5'],
  [0.88, '#373A52', '#FF9A3C'],
  [1, '#141A33', '#7A2A1E'],
] as const;

function skyAt(p: number): [string, string] {
  for (let i = 1; i < SKY.length; i++) {
    const a = SKY[i - 1]!;
    const b = SKY[i]!;
    if (p <= b[0]) {
      const t = (p - a[0]) / (b[0] - a[0]);
      return [mix(a[1], b[1], t), mix(a[2], b[2], t)];
    }
  }
  return [SKY[SKY.length - 1]![1], SKY[SKY.length - 1]![2]];
}

export class Camera {
  x = 0;
  y = 0;
  snap = true;
  follow(
    px: number,
    py: number,
    lookX: number,
    lookY: number,
    viewW: number,
    viewH: number,
    worldW: number,
    worldH: number,
    dt: number,
  ): void {
    const gx = px + lookX - viewW / 2;
    const gy = py + lookY - viewH * 0.5;
    const k = this.snap ? 1 : 1 - Math.exp(-dt * 7);
    this.snap = false;
    this.x += (gx - this.x) * k;
    this.y += (gy - this.y) * k;
    const maxX = worldW * T - viewW;
    this.x = viewW >= worldW * T ? maxX / 2 : Math.min(maxX, Math.max(0, this.x));
    this.y = Math.min(worldH * T - viewH, Math.max(-T * 10, this.y));
  }
}

export class View {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private chunks = new Map<number, { canvas: HTMLCanvasElement; version: number }>();
  private chunkWorld: World | null = null;
  private light: HTMLCanvasElement;
  private lctx: CanvasRenderingContext2D;
  private lightImg: ImageData | null = null;
  readonly fx = new Fx();
  readonly cam = new Camera();
  scale = 2;
  /** Smoothed draw position of the Foreman, so a step up a ledge reads as a hop. */
  private fy = 0;
  private walkT = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.light = document.createElement('canvas');
    this.lctx = this.light.getContext('2d')!;
  }

  /** Integer art scale: ×2 on phones, ×3 on desktops, ×4 on big screens; times the device ratio. */
  resize(cssW: number, cssH: number, dpr: number): void {
    const art = cssW < 700 ? 2 : cssW <= 1600 ? 3 : 4;
    this.scale = Math.max(1, Math.round(art * dpr));
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
  }

  get viewW(): number {
    return this.canvas.width / this.scale;
  }
  get viewH(): number {
    return this.canvas.height / this.scale;
  }

  /** Screen (css px) to world tiles. */
  toWorld(cssX: number, cssY: number): { x: number; y: number } {
    const k = this.canvas.clientWidth ? this.canvas.width / this.canvas.clientWidth : 1;
    return { x: (this.cam.x + (cssX * k) / this.scale) / T, y: (this.cam.y + (cssY * k) / this.scale) / T };
  }

  /** World tiles to screen css px. */
  toScreen(x: number, y: number): { x: number; y: number } {
    const k = this.canvas.clientWidth ? this.canvas.width / this.canvas.clientWidth : 1;
    return { x: ((x * T - this.cam.x) * this.scale) / k, y: ((y * T - this.cam.y) * this.scale) / k };
  }

  /** The quiet backdrop behind the night and Cave-in screens. */
  drawNight(now: number): void {
    const { ctx } = this;
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#141A33');
    g.addColorStop(1, '#262940');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const s = Math.max(2, Math.round(this.scale / 1.5));
    for (let i = 0; i < 90; i++) {
      const x = hash3(i, 1, 7) * W;
      const y = hash3(i, 2, 7) * H * 0.65;
      const tw = 0.5 + 0.5 * Math.sin(now / 600 + i);
      ctx.fillStyle = tw > 0.7 ? '#FFF2A8' : '#E8F4F0';
      ctx.globalAlpha = 0.35 + tw * 0.5;
      ctx.fillRect(Math.round(x), Math.round(y), s, s);
    }
    ctx.globalAlpha = 1;
    // the mountain's shoulder
    ctx.fillStyle = '#0B0F22';
    const step = 4 * this.scale;
    for (let x = 0; x < W; x += step) {
      const u = x / W;
      const top = H * (0.62 + 0.12 * Math.sin(u * 5 + 1) * Math.sin(u * 2.3) + 0.06 * Math.sin(u * 13));
      ctx.fillRect(x, Math.round(top), step, H);
    }
  }

  draw(g: Game, c: Control, now: number, dt: number, touchAim: boolean): void {
    const w = g.world;
    const d = g.day;
    if (!w || !d) {
      this.drawNight(now);
      return;
    }
    if (this.chunkWorld !== w) {
      this.chunks.clear();
      this.chunkWorld = w;
      this.cam.snap = true;
      this.fy = d.body.y;
    }
    const { ctx } = this;
    const s = this.scale;
    const b = d.body;
    // the Foreman's drawn height catches up with a step up, so it reads as a hop
    this.fy += (b.y - this.fy) * Math.min(1, dt * 22);
    if (Math.abs(b.y - this.fy) > 2) this.fy = b.y;
    const look = touchAim
      ? { x: 0, y: 0 }
      : {
          x: Math.max(-1, Math.min(1, (c.aimX - b.x) / 12)) * 36,
          y: Math.max(-1, Math.min(1, (c.aimY - b.y) / 10)) * 24,
        };
    this.cam.follow(b.x * T, (this.fy - 1) * T, look.x, look.y, this.viewW, this.viewH, w.w, w.h, dt);

    const camX = Math.round(this.cam.x * s) / s;
    const camY = Math.round(this.cam.y * s) / s;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.drawSky(camY, Math.min(1, d.t / d.length), g.s.phase === 'dusk');
    const shake = this.fx.shake(now);
    ctx.setTransform(s, 0, 0, s, (-camX + shake.x) * s, (-camY + shake.y) * s);

    this.drawVillage(g, now);
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

    this.drawObjects(w, tx0, ty0, tx1, ty1, frame);
    this.drawKibbles(g, now);
    this.drawGangs(g, now);
    this.drawBombs(g, now);
    this.drawForeman(g, c, now, dt);
    this.fx.drawWorld(ctx, now);
    this.drawLight(g, tx0, ty0, tx1, ty1, now);
    if (g.s.phase === 'day') this.drawAim(g, c, now, touchAim);
    this.fx.drawText(ctx, now);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // dusk: the light goes out of the sky over everything
    if (g.s.phase === 'dusk') {
      ctx.fillStyle = `rgba(20,26,51,${Math.min(0.55, (d.dusk / DAY.duskS) * 0.55)})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private drawSky(camY: number, p: number, dusk: boolean): void {
    const { ctx } = this;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const s = this.scale;
    const horizon = (SKY_ROWS * T - camY) * s;
    const [top, hor] = dusk ? (['#141A33', '#7A2A1E'] as const) : skyAt(p);
    const gr = ctx.createLinearGradient(0, horizon - 240 * s, 0, horizon);
    gr.addColorStop(0, top);
    gr.addColorStop(1, hor);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
    if (horizon > 0) {
      // the sun crosses the sky with the clock
      const sx = W * (0.1 + 0.8 * p);
      const sy = horizon - Math.sin(Math.PI * Math.min(1, p * 1.02)) * 150 * s - 10 * s;
      ctx.fillStyle = p > 0.85 ? '#FF9A3C' : '#FFD65A';
      ctx.fillRect(Math.round(sx - 6 * s), Math.round(sy - 6 * s), 12 * s, 12 * s);
      ctx.fillStyle = '#FFF2A8';
      ctx.fillRect(Math.round(sx - 3 * s), Math.round(sy - 3 * s), 6 * s, 6 * s);
      for (const [k, col, amp, par] of [
        [0.11, p > 0.85 ? '#4B4F6B' : '#8FBFDF', 34, 0.25],
        [0.19, p > 0.85 ? '#262940' : '#3A7A2C', 20, 0.5],
      ] as const) {
        ctx.fillStyle = col;
        const step = 4 * s;
        for (let x = 0; x < W; x += step) {
          const u = (x / s) * par;
          const hgt =
            (Math.sin(u * k * 0.3) * 0.5 + Math.sin(u * k * 0.11 + 2) * 0.5 + 1) * amp * 0.5 + amp * 0.4;
          const t = Math.round(horizon - hgt * s * 2);
          ctx.fillRect(x, t, step, Math.max(0, H - t));
        }
      }
    }
    ctx.fillStyle = '#141A33';
    if (horizon < H) ctx.fillRect(0, Math.max(0, horizon + 4 * T * s), W, H);
  }

  private drawVillage(g: Game, now: number): void {
    const w = g.world!;
    const frame = Math.floor(now / 160);
    const surfY = (x: number): number => (w.surf[x] ?? SKY_ROWS) * T;
    for (const [i, x] of [11, 5, 17, 23].entries())
      drawSprite(this.ctx, 'cottage', i, x * T + T / 2, surfY(x) - 5);
    drawSprite(this.ctx, 'bunkhouse', frame, 8 * T + T / 2, surfY(8));
    drawSprite(this.ctx, 'forge', frame, 14 * T + T / 2, surfY(14));
    drawSprite(this.ctx, 'cart', 0, 30 * T + T / 2, surfY(30));
    drawSprite(this.ctx, 'headframe', frame, SHAFT_X * T + T / 2, surfY(SHAFT_X));
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
          }
          continue;
        }
        const tex = tileTexture(m, tx, ty);
        if (tex) g.drawImage(tex, px, py);
        this.paintEdges(w, g, m, tx, ty, px, py);
      }
  }

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
    if (m === M.GRASS || (m === M.DIRT && up && ty <= w.surf[tx]! + 1)) {
      const v = hash3(tx, ty, 3);
      g.fillStyle = '#4F9A3A';
      g.fillRect(px, py, T, 4);
      g.fillStyle = '#6CC04A';
      g.fillRect(px, py, T, 2);
      g.fillStyle = '#3A7A2C';
      for (let i = 0; i < 4; i++)
        g.fillRect(px + ((i * 5 + Math.floor(v * 7)) % 15), py + 4, 1, 1 + ((i + tx) % 2));
      return;
    }
    g.fillStyle = rgb(light);
    if (up) g.fillRect(px, py, T, 1);
    if (w.get(tx - 1, ty) === M.AIR) g.fillRect(px, py, 1, T);
    g.fillStyle = rgb(dark, 0.8);
    if (w.get(tx, ty + 1) === M.AIR) g.fillRect(px, py + T - 2, T, 2);
    if (w.get(tx + 1, ty) === M.AIR) g.fillRect(px + T - 1, py, 1, T);
  }

  private drawObjects(w: World, tx0: number, ty0: number, tx1: number, ty1: number, frame: number): void {
    for (const [k, kind] of Object.entries(w.objects)) {
      const i = Number(k);
      const x = i % w.w;
      const y = Math.floor(i / w.w);
      if (x < tx0 || x > tx1 || y < ty0 || y > ty1) continue;
      if (kind === 'rope') {
        // a ladder: two rails and rungs, so it reads as something to climb
        const px = x * T;
        const py = y * T;
        this.ctx.fillStyle = '#6B4329';
        this.ctx.fillRect(px + 4, py, 1, T);
        this.ctx.fillRect(px + 11, py, 1, T);
        this.ctx.fillStyle = '#A46D48';
        this.ctx.fillRect(px + 4, py + 3, 8, 1);
        this.ctx.fillRect(px + 4, py + 11, 8, 1);
        continue;
      }
      const spriteName = kind === 'chest' ? 'obj-chest' : kind === 'oldlamp' ? 'obj-lantern' : `obj-${kind}`;
      drawSprite(this.ctx, spriteName, frame + x, x * T + T / 2, y * T + T - 1);
      if (kind === 'chest') {
        // a glint, so chests read in the dark
        if ((frame + x) % 14 < 2) {
          this.ctx.fillStyle = '#FFF2A8';
          this.ctx.fillRect(x * T + 11, y * T + 6, 1, 1);
        }
      }
    }
  }

  private drawKibbles(g: Game, now: number): void {
    const w = g.world!;
    const d = g.day!;
    const filled = d.quota.gt(0) ? Math.min(1, d.deposited.div(d.quota).toNumber()) : 1;
    const frame = Math.min(3, Math.floor(filled * 4));
    const kx = SHAFT_X + 2;
    drawSprite(this.ctx, 'ore-heap', frame, kx * T, (w.surf[kx] ?? SKY_ROWS) * T);
    if (g.s.contract.levels.footKibble > 0) {
      const f = shaftFoot(w, shaftDepth(g.s));
      drawSprite(this.ctx, 'ore-heap', 0, (f.x + 1) * T + T / 2, (f.y + 1) * T);
    }
    // a bobbing arrow over the kibble when the pack is full or the bell has rung
    const full = d.pack.coal.toNumber() + d.pack.ore > 0 && (d.bell || d.warnT > 0);
    if (full) {
      const bob = Math.round(Math.sin(now / 140) * 2);
      const ax = SHAFT_X * T + T / 2;
      const ay = ((w.surf[SHAFT_X] ?? SKY_ROWS) - 4) * T + bob;
      this.ctx.fillStyle = '#FFD65A';
      for (let r = 0; r < 4; r++) this.ctx.fillRect(ax - 3 + r, ay + r, 7 - r * 2, 1);
      this.ctx.fillRect(ax - 1, ay - 4, 3, 4);
    }
  }

  private drawGangs(g: Game, now: number): void {
    const { ctx } = this;
    for (const [i, gang] of g.day!.gangs.entries()) {
      const fx = (gang.x - gang.side) * T + T / 2;
      const fy = (gang.y + 1) * T;
      const show = Math.min(3, gang.count);
      for (let k = 0; k < show; k++) {
        const swing = gang.stuck
          ? Math.floor(now / 600 + k) % 2
          : 2 + (Math.floor(now / 120 + k * 1.7 + i) % 3);
        drawSprite(ctx, 'miner', swing, fx - gang.side * k * 7, fy, gang.side < 0);
      }
      if (gang.count > 1) this.banner(`×${gang.count}`, fx, fy - 27);
    }
  }

  private banner(text: string, cx: number, top: number): void {
    const { ctx } = this;
    ctx.font = '8px Silkscreen, monospace';
    const tw = Math.ceil(ctx.measureText(text).width);
    ctx.fillStyle = 'rgba(20,26,51,0.85)';
    ctx.fillRect(Math.round(cx - tw / 2 - 2), top - 7, tw + 4, 9);
    ctx.fillStyle = '#FFF2A8';
    ctx.fillText(text, Math.round(cx - tw / 2), top);
  }

  private drawBombs(g: Game, now: number): void {
    const { ctx } = this;
    for (const bm of g.day!.bombs) {
      const x = Math.round(bm.x * T);
      const y = Math.round(bm.y * T);
      ctx.fillStyle = '#262940';
      ctx.fillRect(x - 3, y - 3, 6, 6);
      ctx.fillStyle = '#4B4F6B';
      ctx.fillRect(x - 2, y - 3, 2, 1);
      ctx.fillStyle = Math.floor(now / (bm.fuse < 0.4 ? 50 : 120)) % 2 ? '#E0532F' : '#FFD65A';
      ctx.fillRect(x, y - 5, 1, 2);
    }
  }

  private drawForeman(g: Game, c: Control, now: number, dt: number): void {
    const b = g.day!.body;
    const moving = Math.abs(b.vx) > 0.3;
    this.walkT = moving || b.climbing ? this.walkT + dt * (b.climbing ? 0.6 : Math.abs(b.vx) / 6) : 0;
    const digging = c.fire && g.s.phase === 'day';
    let frame: number;
    if (digging) frame = 2 + (Math.floor(now / 80) % 3);
    else if (!b.onGround && !b.climbing) frame = 6;
    else if (moving || (b.climbing && Math.abs(b.vy) > 0.1)) frame = 5 + (Math.floor(this.walkT * 9) % 4);
    else frame = Math.floor(now / 600) % 2;
    const flip = digging ? c.aimX < b.x : b.facing < 0;
    drawSprite(this.ctx, 'foreman', frame, Math.round(b.x * T), Math.round(this.fy * T), flip);
    if (b.jetting) this.fx.jet(b.x * T, this.fy * T - 6, now);
  }

  private drawAim(g: Game, c: Control, now: number, _touch: boolean): void {
    const { ctx } = this;
    const d = g.day!;
    const t = aimTile(g, c);
    if (!t) return;
    const x = t.x * T;
    const y = t.y * T;
    ctx.strokeStyle = Math.floor(now / 200) % 2 ? 'rgba(255,214,90,0.95)' : 'rgba(255,242,168,0.95)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
    const dg = d.dig;
    if (dg && dg.x === t.x && dg.y === t.y) {
      const p = Math.min(1, dg.t / dg.need);
      ctx.fillStyle = 'rgba(20,26,51,0.85)';
      const cracks = [
        [7, 5, 1, 4],
        [8, 8, 3, 1],
        [5, 9, 2, 1],
        [10, 3, 1, 3],
        [4, 4, 2, 1],
        [11, 10, 1, 3],
        [6, 11, 1, 3],
        [2, 7, 3, 1],
        [12, 6, 2, 1],
      ] as const;
      const n = Math.min(9, Math.floor(p * 10));
      for (let i = 0; i < n; i++) {
        const k = cracks[i]!;
        ctx.fillRect(x + k[0], y + k[1], k[2], k[3]);
      }
    }
  }

  private drawLight(g: Game, tx0: number, ty0: number, tx1: number, ty1: number, now: number): void {
    const w = g.world!;
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
    const mx0 = Math.max(0, tx0 - 1);
    const my0 = Math.max(0, ty0 - 1);
    const mx1 = Math.min(w.w - 1, tx1 + 1);
    const my1 = Math.min(w.h - 1, ty1 + 1);
    const warmAt = (x: number, y: number): number => (y < w.surf[x]! ? 1 : w.warm[y * w.w + x]!);
    const coolAt = (x: number, y: number): number => (y < w.surf[x]! ? 0 : w.cool[y * w.w + x]!);
    const sample = (f: (x: number, y: number) => number, fx: number, fy: number): number => {
      const x0 = Math.min(mx1, Math.max(mx0, Math.floor(fx)));
      const y0 = Math.min(my1, Math.max(my0, Math.floor(fy)));
      const x1 = Math.min(mx1, x0 + 1);
      const y1 = Math.min(my1, y0 + 1);
      const ax = Math.min(1, Math.max(0, fx - x0));
      const ay = Math.min(1, Math.max(0, fy - y0));
      return (
        (f(x0, y0) * (1 - ax) + f(x1, y0) * ax) * (1 - ay) + (f(x0, y1) * (1 - ax) + f(x1, y1) * ax) * ay
      );
    };
    const b = g.day!.body;
    const lx = b.x;
    const ly = this.fy - BODY.h * 0.7;
    const wick = g.s.contract.relics.includes('wick') ? 2 : 1;
    const lampFall = (LIGHT.decayAir * 1.25) / wick;
    const lampMax = 1.05;
    const img = this.lightImg!;
    const data = img.data;
    const IW = cw * S;
    const flick = 1 + Math.sin(now / 95) * LIGHT.flicker * 0.5 + Math.sin(now / 37) * LIGHT.flicker * 0.5;
    for (let sy = 0; sy < ch * S; sy++) {
      const py = ty0 + (sy + 0.5) / S;
      for (let sx = 0; sx < IW; sx++) {
        const px = tx0 + (sx + 0.5) / S;
        const tx = Math.floor(px);
        const o = (sy * IW + sx) * 4;
        if (py < w.surf[tx]!) {
          data[o + 3] = 0;
          continue;
        }
        const lamp = Math.max(0, lampMax - Math.hypot(px - lx, py - ly) * lampFall);
        const warm = Math.max(sample(warmAt, px - 0.5, py - 0.5), lamp) * flick;
        const cool = sample(coolAt, px - 0.5, py - 0.5);
        const L = Math.min(1, warm + cool);
        const a = (1 - L) * LIGHT.darkness;
        const ct = Math.min(1, cool) * LIGHT.coolTint;
        const wt = Math.min(1, warm) * LIGHT.warmTint;
        const tA = ct + wt;
        const outA = a + tA * (1 - a);
        if (outA <= 0.001) {
          data[o + 3] = 0;
          continue;
        }
        const tr = tA > 0 ? (70 * ct + 255 * wt) / tA : 0;
        const tg = tA > 0 ? (230 * ct + 170 * wt) / tA : 0;
        const tb = tA > 0 ? (220 * ct + 70 * wt) / tA : 0;
        data[o] = (6 * a + tr * tA * (1 - a)) / outA;
        data[o + 1] = (8 * a + tg * tA * (1 - a)) / outA;
        data[o + 2] = (18 * a + tb * tA * (1 - a)) / outA;
        data[o + 3] = outA * 255;
      }
    }
    this.lctx.putImageData(img, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.light, tx0 * T, ty0 * T, cw * T, ch * T);
  }
}
