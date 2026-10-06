// Tile textures, generated from each material's three-tone ramp (ADR-011). 4 variants per material.
import { TILE_PX } from '../data/constants';
import { M, MATERIALS } from '../data/materials';
import { hash3 } from '../sim/rng';
import { hasSprite, sprite } from './sprites';

const VARIANTS = 4;
const tex = new Map<number, HTMLCanvasElement[]>();
const wallTex = new Map<number, HTMLCanvasElement[]>();

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `rgb(${r},${g},${b})`;
}

function paint(m: number, v: number, k: number, overlay: boolean): HTMLCanvasElement {
  const def = MATERIALS[m]!;
  const hostDef = def.host !== undefined ? MATERIALS[def.host]! : def;
  const [base, light, dark] = hostDef.ramp;
  const c = document.createElement('canvas');
  c.width = TILE_PX;
  c.height = TILE_PX;
  const x = c.getContext('2d')!;
  const px = (col: string, a: number, b: number, w = 1, h = 1): void => {
    x.fillStyle = shade(col, k);
    x.fillRect(a, b, w, h);
  };
  px(base, 0, 0, TILE_PX, TILE_PX);
  const seed = m * 31 + v * 7;
  // speckles and a couple of pebbles
  for (let i = 0; i < 14; i++) {
    const a = Math.floor(hash3(i, v, seed) * 15);
    const b = Math.floor(hash3(i, v, seed + 1) * 15);
    px(i % 2 ? light : dark, a, b, i % 5 === 0 ? 2 : 1, 1);
  }
  for (let i = 0; i < 2; i++) {
    const a = 1 + Math.floor(hash3(i, v, seed + 2) * 12);
    const b = 1 + Math.floor(hash3(i, v, seed + 3) * 12);
    px(light, a, b, 2, 1);
    px(dark, a, b + 1, 3, 1);
  }
  if (m === M.BEDROCK) {
    for (let i = 0; i < 6; i++)
      px('#262940', Math.floor(hash3(i, v, 91) * 14), Math.floor(hash3(i, v, 92) * 14), 2, 2);
  }
  if (m === M.BRICK) {
    x.fillStyle = shade('#373A52', k);
    for (let r = 0; r < 4; r++) {
      x.fillRect(0, r * 4 + 3, 16, 1);
      x.fillRect(((r % 2) * 8 + 4) % 16, r * 4, 1, 3);
      x.fillRect(((r % 2) * 8 + 12) % 16, r * 4, 1, 3);
    }
  }
  if (overlay) {
    const ov = m === M.CARVING ? 'carving' : def.overlay;
    if (ov && hasSprite(ov)) {
      if (k !== 1) x.globalAlpha = k;
      x.drawImage(sprite(ov).frames[0]!, 0, 0);
      x.globalAlpha = 1;
    }
  }
  return c;
}

export function buildTileTextures(): void {
  for (const key of Object.keys(MATERIALS)) {
    const m = Number(key);
    if (m === M.AIR) continue;
    const list: HTMLCanvasElement[] = [];
    const walls: HTMLCanvasElement[] = [];
    for (let v = 0; v < VARIANTS; v++) {
      list.push(paint(m, v, 1, true));
      walls.push(paint(m, v, 0.42, false));
    }
    tex.set(m, list);
    wallTex.set(m, walls);
  }
}

export function tileTexture(m: number, x: number, y: number): HTMLCanvasElement | undefined {
  return tex.get(m)?.[Math.floor(hash3(x, y, 5) * VARIANTS)];
}

export function wallTexture(m: number, x: number, y: number): HTMLCanvasElement | undefined {
  return wallTex.get(m)?.[Math.floor(hash3(x, y, 9) * VARIANTS)];
}
