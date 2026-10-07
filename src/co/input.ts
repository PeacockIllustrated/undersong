// Keyboard, mouse and touch into one Control for the sim (ADR-H006). WASD moves the Foreman; the mouse aims.
import { DIG } from './data/co';
import { chest, idleControl, type Body, type Control } from './sim/body';
import type { View } from './render/view';

export interface TouchState {
  /** Left stick: −1…1 on each axis while a thumb is on it. */
  stick: { x: number; y: number } | null;
  /** Right pad: the direction the thumb pushes, while it is down. */
  aim: { x: number; y: number } | null;
  jump: boolean;
}

export class Input {
  private keys = new Set<string>();
  private mouse = { x: 0, y: 0, in: false, left: false };
  private jumpEdge = false;
  private jumpEdgeUp = false;
  private throwEdge = false;
  private ladderEdge = false;
  private platformEdge = false;
  private toolSel: number | null = null;
  private toolCycle = 0;
  readonly touch: TouchState = { stick: null, aim: null, jump: false };
  /** True once a finger has touched the game: shows the touch controls and hides the mouse aim. */
  usingTouch = false;
  /** The last aim direction a touch used, so the pick keeps pointing there after the thumb lifts. */
  private lastAim = { x: 1, y: 0.3 };
  onPause: (() => void) | null = null;
  /** Keys pressed while not underground (night, title) go here instead. */
  onKey: ((k: string) => boolean) | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', this.down);
    window.addEventListener('keyup', this.up);
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.left = false;
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      this.mouse.x = e.offsetX;
      this.mouse.y = e.offsetY;
      this.mouse.in = true;
      this.usingTouch = false;
    });
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      this.mouse.x = e.offsetX;
      this.mouse.y = e.offsetY;
      if (e.button === 0) this.mouse.left = true;
      if (e.button === 2) this.throwEdge = true;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (e.button === 0) this.mouse.left = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        if (Math.abs(e.deltaY) > 2) this.toolCycle = e.deltaY > 0 ? 1 : -1;
      },
      { passive: false },
    );
  }

  private down = (e: KeyboardEvent): void => {
    const k = e.key.toLowerCase();
    if ((e.target as HTMLElement | null)?.closest?.('input, textarea')) return;
    if (this.onKey?.(k)) {
      e.preventDefault();
      return;
    }
    if (k === 'escape' || k === 'p') {
      this.onPause?.();
      return;
    }
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (e.repeat) return;
    this.keys.add(k);
    if (k === ' ') this.jumpEdge = true;
    if (k === 'w' || k === 'arrowup') {
      this.jumpEdge = true;
      this.jumpEdgeUp = true;
    }
    if (k === 'e' || k === 'q') this.throwEdge = true;
    if (k === 'f') this.ladderEdge = true;
    if (k === 'g') this.platformEdge = true;
    if (k >= '1' && k <= '5') this.toolSel = Number(k) - 1;
  };

  private up = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  pressJump(): void {
    this.jumpEdge = true;
    this.jumpEdgeUp = false;
  }
  pressThrow(): void {
    this.throwEdge = true;
  }
  pressLadder(): void {
    this.ladderEdge = true;
  }
  pressPlatform(): void {
    this.platformEdge = true;
  }
  cycleTool(): void {
    this.toolCycle = 1;
  }
  selectTool(i: number): void {
    this.toolSel = i;
  }

  /** Build this step's control. Edge presses are handed out once, then cleared. */
  control(view: View, body: Body | null): Control {
    const c = idleControl();
    const k = this.keys;
    const t = this.touch;
    const right = k.has('d') || k.has('arrowright');
    const left = k.has('a') || k.has('arrowleft');
    c.ax = (right ? 1 : 0) - (left ? 1 : 0);
    c.up = k.has('w') || k.has('arrowup');
    c.down = k.has('s') || k.has('arrowdown');
    c.jump = k.has(' ') || c.up || t.jump;
    if (t.stick) {
      c.ax = Math.abs(t.stick.x) > 0.25 ? Math.max(-1, Math.min(1, t.stick.x * 1.4)) : 0;
      c.up = c.up || t.stick.y < -0.55;
      c.down = c.down || t.stick.y > 0.55;
    }
    c.jumpPressed = this.jumpEdge;
    c.jumpIsUp = this.jumpEdgeUp;
    c.throwPressed = this.throwEdge;
    c.ladderPressed = this.ladderEdge;
    c.platformPressed = this.platformEdge;
    c.toolSel = this.toolSel;
    c.toolCycle = this.toolCycle;
    this.jumpEdge = this.jumpEdgeUp = this.throwEdge = this.ladderEdge = this.platformEdge = false;
    this.toolSel = null;
    this.toolCycle = 0;

    if (body) {
      const o = chest(body);
      if (t.aim) {
        const len = Math.hypot(t.aim.x, t.aim.y) || 1;
        this.lastAim = { x: t.aim.x / len, y: t.aim.y / len };
        c.fire = true;
      }
      if (this.usingTouch || !this.mouse.in) {
        c.aimX = o.x + this.lastAim.x * DIG.reach;
        c.aimY = o.y + this.lastAim.y * DIG.reach;
        // with no aim held, the pick faces the way the Foreman faces
        if (!t.aim && this.usingTouch) {
          c.aimX = o.x + body.facing * DIG.reach;
          c.aimY = o.y + 0.3;
        }
      } else {
        const p = view.toWorld(this.mouse.x, this.mouse.y);
        c.aimX = p.x;
        c.aimY = p.y;
        c.fire = c.fire || this.mouse.left;
      }
    }
    return c;
  }

  /** A held jump stays held across steps; the edges above do not. */
  reset(): void {
    this.keys.clear();
    this.mouse.left = false;
    this.touch.stick = null;
    this.touch.aim = null;
    this.touch.jump = false;
  }

  get canvasEl(): HTMLCanvasElement {
    return this.canvas;
  }
}
