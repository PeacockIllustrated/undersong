// Mouse, touch and keyboard. Turns gestures into taps, dig paths and camera pans. Never touches state.
import { TILE_PX } from '../data/constants';
import type { Tile } from '../sim/state';
import type { Camera } from './camera';
import { line4 } from '../sim/geom';

export interface InputHooks {
  /** Screen → art pixels. */
  scale(): number;
  /** Is this tile one a drag should start digging from (rather than panning)? */
  isDiggable(x: number, y: number): boolean;
  onTap(x: number, y: number): void;
  onPath(tiles: Tile[]): void;
  /** The player moved the camera themselves. */
  onPan(): void;
}

export const HOLD_MS = 280;
const SLOP_PX = 8;

type Mode = 'idle' | 'pending' | 'pan' | 'dig';

export class Input {
  mode: Mode = 'idle';
  /** Path being drawn, shown by the renderer. */
  path: Tile[] = [];
  /** A touch held on a diggable tile: where, and when it started (polish item 10: a ring fills until dig mode). */
  hold: { x: number; y: number; t0: number } | null = null;
  private sx = 0;
  private sy = 0;
  private lx = 0;
  private ly = 0;
  private t0 = 0;
  private holdTimer = 0;
  private id = -1;
  private keys = new Set<string>();

  constructor(
    private el: HTMLElement,
    private cam: Camera,
    private hooks: InputHooks,
  ) {
    el.addEventListener('pointerdown', this.down);
    el.addEventListener('pointermove', this.move);
    el.addEventListener('pointerup', this.up);
    el.addEventListener('pointercancel', this.cancel);
    el.addEventListener('wheel', this.wheel, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement | null)?.closest('input,textarea')) return;
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }

  private tileAt(clientX: number, clientY: number): Tile {
    const r = this.el.getBoundingClientRect();
    const k = this.cssToArt();
    const ax = this.cam.x + (clientX - r.left) * k;
    const ay = this.cam.y + (clientY - r.top) * k;
    return { x: Math.floor(ax / TILE_PX), y: Math.floor(ay / TILE_PX) };
  }

  /** CSS px → art px factor. */
  private cssToArt(): number {
    const c = this.el as HTMLCanvasElement;
    const dpr = c.clientWidth ? c.width / c.clientWidth : 1;
    return dpr / this.hooks.scale();
  }

  private down = (e: PointerEvent): void => {
    if (this.id !== -1) return;
    this.id = e.pointerId;
    this.el.setPointerCapture(e.pointerId);
    this.sx = this.lx = e.clientX;
    this.sy = this.ly = e.clientY;
    this.t0 = e.timeStamp;
    const t = this.tileAt(e.clientX, e.clientY);
    if (e.pointerType === 'mouse') {
      if (e.button === 0 && this.hooks.isDiggable(t.x, t.y)) {
        this.mode = 'dig';
        this.path = [t];
      } else this.mode = 'pan';
      return;
    }
    // touch and pen: a quick drag pans, a press-and-hold then drag digs
    this.mode = 'pending';
    this.path = [t];
    this.hold = this.hooks.isDiggable(t.x, t.y) ? { x: t.x, y: t.y, t0: performance.now() } : null;
    window.clearTimeout(this.holdTimer);
    this.holdTimer = window.setTimeout(() => {
      this.hold = null;
      if (this.mode === 'pending' && this.hooks.isDiggable(t.x, t.y)) {
        this.mode = 'dig';
        navigator.vibrate?.(12);
      }
    }, HOLD_MS);
  };

  private move = (e: PointerEvent): void => {
    if (e.pointerId !== this.id) return;
    const moved = Math.hypot(e.clientX - this.sx, e.clientY - this.sy);
    if (this.mode === 'pending' && moved > SLOP_PX) {
      window.clearTimeout(this.holdTimer);
      this.hold = null;
      this.mode = 'pan';
    }
    if (this.mode === 'pan') {
      const k = this.cssToArt();
      this.cam.x -= (e.clientX - this.lx) * k;
      this.cam.y -= (e.clientY - this.ly) * k;
      this.hooks.onPan();
    } else if (this.mode === 'dig') {
      const t = this.tileAt(e.clientX, e.clientY);
      const last = this.path[this.path.length - 1]!;
      if (t.x !== last.x || t.y !== last.y) {
        for (const p of line4(last, t).slice(1)) {
          if (!this.path.some((q) => q.x === p.x && q.y === p.y)) this.path.push(p);
        }
        if (this.path.length > 64) this.path.length = 64;
      }
    }
    this.lx = e.clientX;
    this.ly = e.clientY;
  };

  private up = (e: PointerEvent): void => {
    if (e.pointerId !== this.id) return;
    window.clearTimeout(this.holdTimer);
    const quick =
      e.timeStamp - this.t0 < 500 && Math.hypot(e.clientX - this.sx, e.clientY - this.sy) <= SLOP_PX;
    if (this.mode === 'dig') {
      if (this.path.length > 1) this.hooks.onPath(this.path);
      else this.hooks.onTap(this.path[0]!.x, this.path[0]!.y);
    } else if (this.mode === 'pending' || (this.mode === 'pan' && quick)) {
      const t = this.tileAt(e.clientX, e.clientY);
      this.hooks.onTap(t.x, t.y);
    }
    this.cancel(e);
  };

  private cancel = (e: PointerEvent): void => {
    if (e.pointerId !== this.id) return;
    window.clearTimeout(this.holdTimer);
    this.hold = null;
    this.id = -1;
    this.mode = 'idle';
    this.path = [];
  };

  private wheel = (e: WheelEvent): void => {
    e.preventDefault();
    const k = this.cssToArt();
    const unit = e.deltaMode === 1 ? 16 : 1;
    if (e.shiftKey) this.cam.x += e.deltaY * unit * k;
    else {
      this.cam.y += e.deltaY * unit * k;
      this.cam.x += e.deltaX * unit * k;
    }
    this.hooks.onPan();
  };

  /** Keyboard panning, called each frame. */
  update(dt: number): void {
    const v = 260 * dt;
    const k = this.keys;
    const dx = (k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('a') ? 1 : 0);
    const dy = (k.has('arrowdown') || k.has('s') ? 1 : 0) - (k.has('arrowup') || k.has('w') ? 1 : 0);
    this.cam.x += dx * v;
    this.cam.y += dy * v;
    const moved = dx !== 0 || dy !== 0;
    if (moved) this.hooks.onPan();
  }
}
