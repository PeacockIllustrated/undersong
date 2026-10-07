// Mouse, touch and keyboard. Turns gestures into taps, dig paths and camera pans. Never touches state.
import { TILE_PX } from '../data/constants';
import type { Tile } from '../sim/state';
import type { Camera } from './camera';
import { line4 } from '../sim/geom';
import { settings } from '../settings';
import { AIM, HAPTICS, SMART_DIG, ZOOM } from '../data/touch';

export interface InputHooks {
  /** Screen → art pixels. */
  scale(): number;
  /** Is this tile one a drag should start digging from (rather than panning)? */
  isDiggable(x: number, y: number): boolean;
  /** `touch` is true for a finger or pen, where aim is rough. */
  onTap(x: number, y: number, touch: boolean): void;
  /** M7-02: is this an ore tile a long press can take the whole vein from? */
  isOre(x: number, y: number): boolean;
  /** M7-02: a long press on ore with Smart dig on. */
  onVein(x: number, y: number): void;
  onPath(tiles: Tile[]): void;
  /** The player moved the camera themselves. */
  onPan(): void;
  /** M7-05: one zoom step in (1) or out (-1). */
  onZoom(dir: 1 | -1): void;
  /** M7-05: a press while the Mountain view is up (CSS px in the canvas). True if it was taken. */
  mountainTap(x: number, y: number): boolean;
}

export const HOLD_MS = 280;
const SLOP_PX = 8;

type Mode = 'idle' | 'pending' | 'pan' | 'dig' | 'pinch';

export class Input {
  mode: Mode = 'idle';
  /** Path being drawn, shown by the renderer. */
  path: Tile[] = [];
  /** A touch held on a diggable tile: where, and when it started (polish item 10: a ring fills until dig mode). */
  hold: { x: number; y: number; t0: number } | null = null;
  /** M7-01: the finger, in CSS px from the canvas's top left, while a touch is aiming at rock. */
  touch: { x: number; y: number } | null = null;
  /** M7-01: the tile a touch is aiming at (under the finger, or under the crosshair above it). */
  aimTile: Tile | null = null;
  /** M7-03: the tile under an idle mouse, and when it got there (performance.now ms). */
  hover: { x: number; y: number; t0: number } | null = null;
  private sx = 0;
  private sy = 0;
  private lx = 0;
  private ly = 0;
  private t0 = 0;
  private holdTimer = 0;
  private veinTimer = 0;
  private id = -1;
  /** M7-05: the second finger of a pinch, and the spread at the last zoom step. */
  private id2 = -1;
  private p2 = { x: 0, y: 0 };
  private spread = 0;
  private wheelAcc = 0;
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
    el.addEventListener('pointerleave', () => (this.hover = null));
    el.addEventListener('wheel', this.wheel, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement | null)?.closest('input,textarea')) return;
      this.keys.add(e.key.toLowerCase());
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '+' || e.key === '=') this.hooks.onZoom(1);
      else if (e.key === '-' || e.key === '_') this.hooks.onZoom(-1);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }

  /** Crosshair aim lifts a touch's target above the finger (CSS px). */
  private lift(e: PointerEvent): number {
    return e.pointerType !== 'mouse' && settings().aim === 'crosshair' ? AIM.crossLift : 0;
  }

  private aimAt(e: PointerEvent): Tile {
    return this.tileAt(e.clientX, e.clientY - this.lift(e));
  }

  /** Keep the loupe or crosshair on the finger while a touch is on rock. */
  private track(e: PointerEvent): void {
    if (e.pointerType === 'mouse' || settings().aim === 'off') {
      this.touch = null;
      this.aimTile = null;
      return;
    }
    const r = this.el.getBoundingClientRect();
    this.touch = { x: e.clientX - r.left, y: e.clientY - r.top };
    this.aimTile = this.aimAt(e);
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
    if (this.id !== -1) {
      // M7-05: a second finger turns whatever the first was doing into a pinch
      if (e.pointerType === 'mouse' || this.id2 !== -1) return;
      this.stopTimers();
      this.id2 = e.pointerId;
      this.el.setPointerCapture(e.pointerId);
      this.p2 = { x: e.clientX, y: e.clientY };
      this.spread = Math.hypot(e.clientX - this.lx, e.clientY - this.ly);
      this.mode = 'pinch';
      this.path = [];
      this.hold = null;
      this.touch = null;
      this.aimTile = null;
      return;
    }
    const r = this.el.getBoundingClientRect();
    if (this.hooks.mountainTap(e.clientX - r.left, e.clientY - r.top)) return;
    this.id = e.pointerId;
    this.el.setPointerCapture(e.pointerId);
    this.sx = this.lx = e.clientX;
    this.sy = this.ly = e.clientY;
    this.t0 = e.timeStamp;
    const t = this.aimAt(e);
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
    const onRock = this.hooks.isDiggable(t.x, t.y);
    this.hold = onRock ? { x: t.x, y: t.y, t0: performance.now() } : null;
    if (onRock) this.track(e);
    window.clearTimeout(this.holdTimer);
    window.clearTimeout(this.veinTimer);
    this.holdTimer = window.setTimeout(() => {
      this.hold = null;
      if (this.mode === 'pending' && this.hooks.isDiggable(t.x, t.y)) {
        this.mode = 'dig';
        buzz(HAPTICS.hold);
      }
    }, HOLD_MS);
    // M7-02: hold still on ore a little longer and the whole vein is queued
    if (settings().smartDig && this.hooks.isOre(t.x, t.y))
      this.veinTimer = window.setTimeout(() => {
        const p = this.path;
        if (this.mode === 'dig' && p.length === 1 && p[0]!.x === t.x && p[0]!.y === t.y) {
          this.hooks.onVein(t.x, t.y);
          buzz(HAPTICS.rushOre);
          this.mode = 'idle';
          this.path = [];
          this.touch = null;
          this.aimTile = null;
        }
      }, SMART_DIG.veinHoldMs);
  };

  private move = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' && this.id === -1) {
      const t = this.tileAt(e.clientX, e.clientY);
      if (this.hover?.x !== t.x || this.hover.y !== t.y) this.hover = { ...t, t0: performance.now() };
    } else this.hover = null;
    if (this.mode === 'pinch') {
      if (e.pointerId === this.id2) this.p2 = { x: e.clientX, y: e.clientY };
      else if (e.pointerId === this.id) {
        this.lx = e.clientX;
        this.ly = e.clientY;
      } else return;
      const d = Math.hypot(this.p2.x - this.lx, this.p2.y - this.ly);
      if (this.spread > 0 && (d / this.spread > ZOOM.pinchStep || this.spread / d > ZOOM.pinchStep)) {
        this.hooks.onZoom(d > this.spread ? 1 : -1);
        this.spread = d;
      }
      return;
    }
    if (e.pointerId !== this.id) return;
    const moved = Math.hypot(e.clientX - this.sx, e.clientY - this.sy);
    if (this.mode === 'pending' && moved > SLOP_PX) {
      window.clearTimeout(this.holdTimer);
      window.clearTimeout(this.veinTimer);
      this.hold = null;
      this.touch = null;
      this.aimTile = null;
      this.mode = 'pan';
    }
    if (this.mode === 'pan') {
      const k = this.cssToArt();
      this.cam.x -= (e.clientX - this.lx) * k;
      this.cam.y -= (e.clientY - this.ly) * k;
      this.hooks.onPan();
    } else if (this.mode === 'dig') {
      if (this.touch) this.track(e);
      const t = this.aimAt(e);
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
    if (this.mode === 'pinch' && (e.pointerId === this.id || e.pointerId === this.id2))
      return this.endPinch();
    if (e.pointerId !== this.id) return;
    window.clearTimeout(this.holdTimer);
    window.clearTimeout(this.veinTimer);
    // M7-01: lifting a touch off the edge of the view cancels the dig
    const r = this.el.getBoundingClientRect();
    const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if (outside && e.pointerType !== 'mouse') return this.cancel(e);
    const quick =
      e.timeStamp - this.t0 < 500 && Math.hypot(e.clientX - this.sx, e.clientY - this.sy) <= SLOP_PX;
    if (this.mode === 'dig') {
      if (this.path.length > 1) this.hooks.onPath(this.path);
      else this.hooks.onTap(this.path[0]!.x, this.path[0]!.y, e.pointerType !== 'mouse');
    } else if (this.mode === 'pending' || (this.mode === 'pan' && quick)) {
      const t = this.aimAt(e);
      this.hooks.onTap(t.x, t.y, e.pointerType !== 'mouse');
    }
    this.cancel(e);
  };

  private stopTimers(): void {
    window.clearTimeout(this.holdTimer);
    window.clearTimeout(this.veinTimer);
  }

  /** Either finger lifting ends a pinch; the other one does nothing until it is put down again. */
  private endPinch(): void {
    this.id = -1;
    this.id2 = -1;
    this.mode = 'idle';
    this.path = [];
  }

  private cancel = (e: PointerEvent): void => {
    if (this.mode === 'pinch' && (e.pointerId === this.id || e.pointerId === this.id2))
      return this.endPinch();
    if (e.pointerId !== this.id) return;
    this.stopTimers();
    this.hold = null;
    this.touch = null;
    this.aimTile = null;
    this.id = -1;
    this.mode = 'idle';
    this.path = [];
  };

  private wheel = (e: WheelEvent): void => {
    e.preventDefault();
    const k = this.cssToArt();
    const unit = e.deltaMode === 1 ? 16 : 1;
    // M7-05: Ctrl + wheel (and a trackpad pinch, which arrives the same way) zooms in whole steps
    if (e.ctrlKey) {
      this.wheelAcc += e.deltaY * unit;
      if (Math.abs(this.wheelAcc) >= ZOOM.wheelStep) {
        this.hooks.onZoom(this.wheelAcc < 0 ? 1 : -1);
        this.wheelAcc = 0;
      }
      return;
    }
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

/** M7-06: a short buzz where the device can and the player wants it. */
export function buzz(ms: number): void {
  if (settings().haptics) navigator.vibrate?.(ms);
}
