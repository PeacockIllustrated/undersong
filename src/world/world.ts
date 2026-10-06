// The tile world: materials, water, heat and light, in flat typed arrays. dev-bible §1.4
import { CHUNK, SKY_ROWS, WORLD_W } from '../data/constants';
import { M, MATERIALS } from '../data/materials';
import type { ObjKind } from '../data/objects';
import { relightRect } from './lighting';

export interface Carving {
  verse: number;
  x: number;
  y: number;
}

export class World {
  readonly w: number;
  h: number;
  readonly seed: number;
  mat: Uint8Array;
  water: Uint8Array;
  heat: Float32Array;
  warm: Float32Array;
  cool: Float32Array;
  /** Grass row per column. */
  readonly surf: Int16Array;
  carvings: Carving[] = [];
  /** Shared with GameState.world.objects (keys are tile indices). */
  objects: Record<string, ObjKind> = {};
  lanternsLit = true;
  /** Torch strength multiplier from Echo upgrades. */
  torchMult = 1;
  /** Per-chunk flags. */
  lightDirty: Uint8Array;
  /** Per-chunk version, bumped on any visual change, read by the renderer. */
  version: Uint32Array;
  /** Called on every material change so the sim can record save diffs. */
  onSet: ((i: number, m: number) => void) | null = null;

  constructor(seed: number, h: number) {
    this.w = WORLD_W;
    this.h = h;
    this.seed = seed;
    const n = this.w * h;
    this.mat = new Uint8Array(n);
    this.water = new Uint8Array(n);
    this.heat = new Float32Array(n);
    this.warm = new Float32Array(n);
    this.cool = new Float32Array(n);
    this.surf = new Int16Array(this.w).fill(SKY_ROWS);
    const chunks = this.chunksX * Math.ceil(h / CHUNK);
    this.lightDirty = new Uint8Array(chunks).fill(1);
    this.version = new Uint32Array(chunks);
  }

  get chunksX(): number {
    return Math.ceil(this.w / CHUNK);
  }
  get chunksY(): number {
    return Math.ceil(this.h / CHUNK);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  idx(x: number, y: number): number {
    return y * this.w + x;
  }
  get(x: number, y: number): number {
    return this.inside(x, y) ? this.mat[y * this.w + x]! : M.BEDROCK;
  }
  /** Depth in tiles below the nominal grass line (can be negative in the sky). */
  depth(y: number): number {
    return y - SKY_ROWS;
  }
  isAir(x: number, y: number): boolean {
    return this.inside(x, y) && this.mat[y * this.w + x] === M.AIR;
  }
  /** A solid tile that touches air on any side can be worked. */
  exposed(x: number, y: number): boolean {
    return this.isAir(x - 1, y) || this.isAir(x + 1, y) || this.isAir(x, y - 1) || this.isAir(x, y + 1);
  }

  set(x: number, y: number, m: number): void {
    if (!this.inside(x, y)) return;
    const i = y * this.w + x;
    if (this.mat[i] === m) return;
    this.mat[i] = m;
    this.onSet?.(i, m);
    this.touch(x, y);
  }

  objectAt(x: number, y: number): ObjKind | undefined {
    return this.objects[String(this.idx(x, y))];
  }

  /** Mark lighting and render caches around a tile as stale. */
  touch(x: number, y: number, radius = 19): void {
    const cx0 = Math.max(0, Math.floor((x - radius) / CHUNK));
    const cx1 = Math.min(this.chunksX - 1, Math.floor((x + radius) / CHUNK));
    const cy0 = Math.max(0, Math.floor((y - radius) / CHUNK));
    const cy1 = Math.min(this.chunksY - 1, Math.floor((y + radius) / CHUNK));
    for (let cy = cy0; cy <= cy1; cy++)
      for (let cx = cx0; cx <= cx1; cx++) {
        const c = cy * this.chunksX + cx;
        this.lightDirty[c] = 1;
        this.version[c] = this.version[c]! + 1;
      }
  }

  touchAll(): void {
    this.lightDirty.fill(1);
    for (let i = 0; i < this.version.length; i++) this.version[i] = this.version[i]! + 1;
  }

  /** Recompute light for one chunk if it is stale. */
  ensureLightChunk(cx: number, cy: number): void {
    const c = cy * this.chunksX + cx;
    if (!this.lightDirty[c]) return;
    this.lightDirty[c] = 0;
    relightRect(
      this,
      cx * CHUNK,
      cy * CHUNK,
      Math.min(this.w, (cx + 1) * CHUNK),
      Math.min(this.h, (cy + 1) * CHUNK),
    );
  }

  ensureLightAt(x: number, y: number): void {
    if (!this.inside(x, y)) return;
    this.ensureLightChunk(Math.floor(x / CHUNK), Math.floor(y / CHUNK));
  }

  /** Total light (both channels, unclamped) used by the sim. */
  lightAt(x: number, y: number): number {
    if (!this.inside(x, y)) return 0;
    this.ensureLightAt(x, y);
    const i = y * this.w + x;
    return this.warm[i]! + this.cool[i]!;
  }

  /** Brightest light on any open face of a tile: what a worker standing next to it sees. */
  faceLight(x: number, y: number): number {
    let best = 0;
    for (const [dx, dy] of NEIGH4) {
      if (this.isAir(x + dx, y + dy)) best = Math.max(best, this.lightAt(x + dx, y + dy));
    }
    return best;
  }

  hardnessOf(x: number, y: number): number {
    return MATERIALS[this.get(x, y)]?.hardness ?? 0;
  }

  /** Grow the world downward (Endless Depth). New rows are filled by the caller. */
  grow(rows: number): void {
    const oldN = this.w * this.h;
    this.h += rows;
    const n = this.w * this.h;
    const grow8 = (a: Uint8Array): Uint8Array => {
      const b = new Uint8Array(n);
      b.set(a.subarray(0, oldN));
      return b;
    };
    const growF = (a: Float32Array): Float32Array => {
      const b = new Float32Array(n);
      b.set(a.subarray(0, oldN));
      return b;
    };
    this.mat = grow8(this.mat);
    this.water = grow8(this.water);
    this.heat = growF(this.heat);
    this.warm = growF(this.warm);
    this.cool = growF(this.cool);
    const chunks = this.chunksX * this.chunksY;
    const ld = new Uint8Array(chunks).fill(1);
    const v = new Uint32Array(chunks);
    v.set(this.version.subarray(0, Math.min(this.version.length, chunks)));
    this.lightDirty = ld;
    this.version = v;
    this.touchAll();
  }
}

export const NEIGH4: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export const NEIGH8: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
