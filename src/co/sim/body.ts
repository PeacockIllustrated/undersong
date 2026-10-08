// The Foreman's body: run, jump, climb, swim and fly through the tile world at a fixed 60 Hz (ADR-H006).
// Positions are in tiles; y grows downward and is the Foreman's feet. Pure: the same inputs give the same moves.
import { M } from '../../data/materials';
import type { World } from '../../world/world';
import { BODY } from '../data/co';

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  climbing: boolean;
  swimming: boolean;
  facing: -1 | 1;
  coyote: number;
  buffer: number;
  jumps: number;
  /** The current jump has already been cut short by letting go. */
  cut: boolean;
  jetFuel: number;
  jetting: boolean;
}

export interface Control {
  /** −1 left … 1 right. */
  ax: number;
  up: boolean;
  down: boolean;
  /** Jump held this step, and pressed since the last step. */
  jump: boolean;
  jumpPressed: boolean;
  /** The jump came from up (W): on a ladder it climbs instead. */
  jumpIsUp: boolean;
  fire: boolean;
  /** Where the Foreman aims, in world tiles. */
  aimX: number;
  aimY: number;
  throwPressed: boolean;
  ladderPressed: boolean;
  platformPressed: boolean;
  /** A tool picked by number this step (0-based), and a scroll through the belt (−1, 0, 1). */
  toolSel: number | null;
  toolCycle: number;
}

export interface Mobility {
  runMult: number;
  doubleJump: boolean;
  wings?: boolean;
  jetFuelS: number;
  platform?: PlatformAt;
}

export const idleControl = (): Control => ({
  ax: 0,
  up: false,
  down: false,
  jump: false,
  jumpPressed: false,
  jumpIsUp: false,
  fire: false,
  aimX: 0,
  aimY: 0,
  throwPressed: false,
  ladderPressed: false,
  platformPressed: false,
  toolSel: null,
  toolCycle: 0,
});

export function newBody(x: number, y: number): Body {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    onGround: false,
    climbing: false,
    swimming: false,
    facing: 1,
    coyote: 0,
    buffer: 0,
    jumps: 0,
    cut: false,
    jetFuel: 0,
    jetting: false,
  };
}

const EPS = 1e-4;

/** Solid for movement: any rock. Outside the world sides and floor is bedrock; above the top is open sky. */
export function solid(w: World, x: number, y: number): boolean {
  if (y < 0) return false;
  return w.get(x, y) !== M.AIR;
}

/** Does a body with its feet at (x, y) overlap any solid tile? */
export function boxHits(w: World, x: number, y: number): boolean {
  const x0 = Math.floor(x - BODY.w / 2);
  const x1 = Math.floor(x + BODY.w / 2 - EPS);
  const y0 = Math.floor(y - BODY.h);
  const y1 = Math.floor(y - EPS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solid(w, tx, ty)) return true;
  return false;
}

/** A ladder (rope) in any tile the body overlaps. */
export function onLadder(w: World, b: Body): boolean {
  const tx = Math.floor(b.x);
  for (const yy of [b.y - 0.2, b.y - BODY.h * 0.6]) {
    const ty = Math.floor(yy);
    if (w.inside(tx, ty) && w.objects[String(w.idx(tx, ty))] === 'rope') return true;
  }
  return false;
}

/** One-way platforms, by tile: they hold you up from above and let you through from below. */
export type PlatformAt = (x: number, y: number) => boolean;

function landsOnPlatform(isPlatform: PlatformAt, x: number, y0: number, y1: number): number | null {
  // the feet cross the top of a platform row while falling
  const row = Math.ceil(y0 - 1e-4);
  if (y1 <= row) return null;
  const xa = Math.floor(x - BODY.w / 2);
  const xb = Math.floor(x + BODY.w / 2 - EPS);
  for (let tx = xa; tx <= xb; tx++) if (isPlatform(tx, row)) return row;
  return null;
}

function inWater(w: World, b: Body): boolean {
  const tx = Math.floor(b.x);
  const ty = Math.floor(b.y - BODY.h * 0.5);
  return w.inside(tx, ty) && w.water[w.idx(tx, ty)]! >= 4;
}

const toward = (v: number, target: number, step: number): number =>
  v < target ? Math.min(target, v + step) : Math.max(target, v - step);

/** Step the body by dt seconds. Returns 'jump' or a landing speed for sound and dust, else null. */
export function stepBody(w: World, b: Body, c: Control, mob: Mobility, dt: number): 'jump' | number | null {
  let out: 'jump' | number | null = null;
  const ladder = onLadder(w, b);
  const jumpPressed = c.jumpPressed && !(ladder && c.jumpIsUp);
  b.swimming = inWater(w, b);
  if (c.ax > 0.2) b.facing = 1;
  else if (c.ax < -0.2) b.facing = -1;

  // run
  const top = BODY.run * mob.runMult * (b.swimming ? 0.6 : 1);
  const target = c.ax * top;
  const acc = b.onGround ? (c.ax === 0 ? BODY.friction : BODY.accel) : BODY.airAccel;
  b.vx = toward(b.vx, target, acc * dt);

  // ladders: grab with up or down, let go by leaving the rope or jumping
  if (ladder && (c.up || c.down) && !jumpPressed) b.climbing = true;
  if (!ladder) b.climbing = false;

  // jump timing: a short buffer before landing and a short grace after leaving an edge
  b.buffer = jumpPressed ? BODY.bufferS : Math.max(0, b.buffer - dt);
  b.coyote = b.onGround || b.climbing ? BODY.coyoteS : Math.max(0, b.coyote - dt);
  if (b.onGround) {
    b.jumps = 0;
    b.jetFuel = mob.jetFuelS;
  }
  let jumped = false;
  if (b.buffer > 0) {
    if (b.swimming) {
      b.vy = -BODY.swimStroke;
      b.buffer = 0;
      jumped = true;
    } else if (b.coyote > 0) {
      b.vy = -BODY.jump;
      b.climbing = false;
      b.jumps = 1;
      jumped = true;
    } else if (mob.doubleJump && b.jumps < 2) {
      b.vy = -BODY.jump * 0.9;
      b.jumps = 2;
      jumped = true;
    } else if (mob.wings && b.jumps < (mob.doubleJump ? 2 : 1) + BODY.flaps) {
      // a flap of the wings
      b.vy = -BODY.jump * BODY.flap;
      b.jumps = Math.max(b.jumps, mob.doubleJump ? 2 : 1) + 1;
      jumped = true;
    }
    if (jumped) {
      b.buffer = 0;
      b.coyote = 0;
      b.cut = false;
      out = 'jump';
    }
  }

  // jetpack: hold jump in the air once the jump has run out of rise
  b.jetting = false;
  if (
    !jumped &&
    c.jump &&
    !(ladder && c.jumpIsUp) &&
    !b.onGround &&
    !b.climbing &&
    !b.swimming &&
    b.jetFuel > 0 &&
    b.vy > -BODY.jetMaxRise * 0.6
  ) {
    b.vy = Math.max(-BODY.jetMaxRise, b.vy - BODY.jetPush * dt);
    b.jetFuel = Math.max(0, b.jetFuel - dt);
    b.jetting = true;
  }
  // let go early for a short hop
  if (!c.jump && b.vy < 0 && !b.cut && !b.jetting && !b.climbing) {
    b.vy *= BODY.jumpCut;
    b.cut = true;
  }

  if (b.climbing) {
    b.vy = ((c.down ? 1 : 0) - (c.up ? 1 : 0)) * BODY.climb;
    b.vx = toward(b.vx, c.ax * BODY.climb * 0.6, BODY.accel * dt);
  } else if (b.swimming) {
    b.vy = Math.min(BODY.swimFall, b.vy + BODY.gravity * BODY.swimGravity * dt);
  } else {
    b.vy = Math.min(BODY.maxFall, b.vy + BODY.gravity * dt);
    // gliding: jump held on the way down, with wings and no jet firing
    if (mob.wings && c.jump && b.vy > BODY.glideFall && !b.jetting) b.vy = BODY.glideFall;
  }

  // move across, stepping up single-tile ledges while on the ground
  const nx = b.x + b.vx * dt;
  if (!boxHits(w, nx, b.y)) b.x = nx;
  else if (
    (b.onGround || b.climbing) &&
    b.vx !== 0 &&
    !boxHits(w, nx, Math.floor(b.y - EPS)) &&
    !boxHits(w, b.x, Math.floor(b.y - EPS))
  ) {
    b.y = Math.floor(b.y - EPS);
    b.x = nx;
  } else {
    if (b.vx > 0) b.x = Math.floor(nx + BODY.w / 2) - BODY.w / 2 - EPS;
    else if (b.vx < 0) b.x = Math.floor(nx - BODY.w / 2) + 1 + BODY.w / 2 + EPS;
    if (boxHits(w, b.x, b.y)) b.x = nx - b.vx * dt;
    b.vx = 0;
  }

  // move down or up
  const ny = b.y + b.vy * dt;
  const wasGround = b.onGround;
  const fallSpeed = b.vy;
  b.onGround = false;
  const isPlat = mob.platform ?? ((): boolean => false);
  const plat = b.vy > 0 && !c.down && !b.climbing ? landsOnPlatform(isPlat, b.x, b.y, ny) : null;
  if (plat !== null) {
    b.y = plat;
    b.vy = 0;
    b.onGround = true;
  } else if (!boxHits(w, b.x, ny)) b.y = ny;
  else if (b.vy > 0) {
    b.y = Math.floor(ny - EPS);
    if (boxHits(w, b.x, b.y)) b.y = ny - b.vy * dt;
    b.vy = 0;
    b.onGround = true;
  } else {
    b.y = Math.floor(ny - BODY.h) + 1 + BODY.h;
    if (boxHits(w, b.x, b.y)) b.y = ny - b.vy * dt;
    b.vy = 0;
  }
  // standing still on the ground: check the tiles under the feet
  const standing =
    boxHits(w, b.x, b.y + 0.01) ||
    (!c.down &&
      [Math.floor(b.x - BODY.w / 2), Math.floor(b.x + BODY.w / 2 - EPS)].some((tx) =>
        isPlat(tx, Math.round(b.y)),
      ));
  if (!b.onGround && b.vy >= 0 && Math.abs(b.y - Math.round(b.y)) < 0.002 && standing) {
    b.y = Math.round(b.y);
    b.onGround = true;
    b.vy = 0;
  }
  if (b.onGround) b.climbing = false;
  if (b.onGround && !wasGround && fallSpeed > 4 && out === null) out = fallSpeed;
  return out;
}

/** The body's chest, where the pick swings from and charges are thrown. */
export const chest = (b: Body): { x: number; y: number } => ({ x: b.x, y: b.y - BODY.h * 0.62 });
