// Deterministic mountain generation from a seed. dev-bible §1.4, canon §2
import { BASE_WORLD_H, HEART_FLOOR_D, SHAFT_X, SKY_ROWS } from '../data/constants';
import { biomeAt, ENDLESS_CYCLE } from '../data/biomes';
import { M } from '../data/materials';
import { hash3, makeRng } from '../sim/rng';
import { fbm, valueNoise } from './noise';
import { World } from './world';

export interface GenOptions {
  /** Depth (tiles) of the old shaft left by earlier cycles (Echo upgrade "Old Shafts"). */
  oldShaftD?: number;
  /** Rows of Endless Depth below the Heart floor. */
  endlessRows?: number;
}

/** Village flat ground and the shaft collar. */
const VILLAGE_X0 = 2;
const VILLAGE_X1 = SHAFT_X + 3;
const PRE_DUG = 3;

/** Where each verse is carved: biome band (depth tiles) and which side of the shaft. */
export const VERSE_BANDS: readonly { d0: number; d1: number }[] = [
  { d0: 10, d1: 20 }, // I
  { d0: 24, d1: 36 }, // II
  { d0: 42, d1: 58 }, // III
  { d0: 60, d1: 78 }, // IV
  { d0: 80, d1: 96 }, // V
  { d0: 0, d1: 0 }, // VI  drowned town
  { d0: 0, d1: 0 }, // VII drowned town
  { d0: 0, d1: 0 }, // VIII drowned town
  { d0: 180, d1: 214 }, // IX
  { d0: 218, d1: 246 }, // X
  { d0: 270, d1: 340 }, // XI
  { d0: 0, d1: 0 }, // XII heart
];

/** Drowned town street row (depth tiles). canon §2 Flooded Halls */
export const TOWN_STREET_D = 138;
export const TOWN_HOUSES_X = [8, 18, 46, 56] as const;
export const HEART_CENTER_D = 364;

export function generateWorld(seed: number, opts: GenOptions = {}): World {
  const h = BASE_WORLD_H + (opts.endlessRows ?? 0);
  const w = new World(seed, h);
  const S = seed;

  for (let x = 0; x < w.w; x++) {
    let s = SKY_ROWS + Math.round((valueNoise(x * 0.18, 0, S + 7) - 0.5) * 3);
    if (x >= VILLAGE_X0 && x <= VILLAGE_X1) s = SKY_ROWS;
    w.surf[x] = s;
  }

  for (let y = 0; y < h; y++)
    for (let x = 0; x < w.w; x++) {
      w.mat[y * w.w + x] = baseTile(w, x, y, S, opts);
    }

  carveFeatures(w, S, opts);
  placeCarvings(w, S);
  placeChests(w, S);
  floodHalls(w);
  w.touchAll();
  return w;
}

function baseTile(w: World, x: number, y: number, S: number, opts: GenOptions): number {
  if (x === 0 || x === w.w - 1) return M.BEDROCK;
  const s = w.surf[x]!;
  if (y < s) return M.AIR;
  if (y === s) return M.GRASS;
  const d = y - SKY_ROWS;
  const floor = HEART_FLOOR_D + (opts.endlessRows ?? 0);
  if (d >= floor) return M.BEDROCK;
  if (d >= HEART_FLOOR_D) return endlessTile(x, y, d, S);
  // biome edges wobble a little
  const wob = Math.round((valueNoise(x * 0.2, d * 0.05, S + 3) - 0.5) * 4);
  const b = biomeAt(d + wob).id;
  const n1 = fbm(x * 0.22, y * 0.22, S + 11);
  const n2 = fbm(x * 0.25, y * 0.25, S + 23);
  const cave = fbm(x * 0.09, y * 0.16, S + 31);
  switch (b) {
    case 0:
    case 1: {
      if (y - s < 4) return n1 > 0.8 && y - s > 1 ? M.STONE : M.DIRT;
      if (d > 8 && cave > 0.74) return M.AIR;
      if (n1 > 0.7) return M.COPPER;
      if (n2 > 0.76) return M.TIN;
      if (fbm(x * 0.15, y * 0.15, S + 41) > 0.72 && d < 24) return M.DIRT;
      return M.STONE;
    }
    case 2: {
      if (cave > 0.64) return M.AIR;
      if (n1 > 0.72) return M.IRON;
      if (n2 > 0.82) return M.COPPER;
      return M.SLATE;
    }
    case 3: {
      if (cave > 0.7) return M.AIR;
      if (n1 > 0.76) return M.SILVER;
      if (n2 > 0.84) return M.AQUA;
      return M.SLATE;
    }
    case 4: {
      if (cave > 0.78) return M.AIR;
      if (n1 > 0.8) return M.CRYSTAL;
      if (n2 > 0.8) return M.SILVER;
      return M.SLATE;
    }
    case 5: {
      if (cave > 0.74) return M.AIR;
      if (n1 > 0.72) return M.EMBER;
      if (n2 > 0.8) return M.GOLD;
      return M.BASALT;
    }
    default: {
      if (n1 > 0.86) return M.HEART;
      return M.HEARTWALL;
    }
  }
}

function endlessTile(x: number, y: number, d: number, S: number): number {
  const band = Math.floor((d - HEART_FLOOR_D) / 64);
  const look = ENDLESS_CYCLE[band % ENDLESS_CYCLE.length]!;
  const n1 = fbm(x * 0.22, y * 0.22, S + 211 + band);
  const cave = fbm(x * 0.09, y * 0.16, S + 231 + band);
  if (cave > 0.74) return M.AIR;
  if (look === 2) return n1 > 0.72 ? M.IRON : n1 < 0.12 ? M.GLOWCAP : M.SLATE;
  if (look === 3) return n1 > 0.75 ? M.SILVER : n1 < 0.1 ? M.AQUA : M.SLATE;
  if (look === 4) return n1 > 0.78 ? M.CRYSTAL : M.SLATE;
  return n1 > 0.72 ? M.EMBER : n1 < 0.1 ? M.GOLD : M.BASALT;
}

function setRect(w: World, x0: number, y0: number, x1: number, y1: number, m: number): void {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) if (x > 0 && x < w.w - 1 && w.inside(x, y)) w.mat[y * w.w + x] = m;
}

function ellipse(
  w: World,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fn: (x: number, y: number, e: number) => void,
): void {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
    for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      if (x <= 0 || x >= w.w - 1 || !w.inside(x, y)) continue;
      const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      fn(x, y, e);
    }
}

function carveFeatures(w: World, S: number, opts: GenOptions): void {
  const rng = makeRng(S ^ 0x5eed);
  const Y = (d: number): number => SKY_ROWS + d;

  // Shaft collar: a few tiles pre-dug, and a clear column so the start reads well.
  for (let d = 1; d <= PRE_DUG; d++) w.mat[Y(d) * w.w + SHAFT_X] = M.AIR;
  for (let d = 1; d <= 6; d++) {
    for (const dx of [-1, 1]) {
      const i = Y(d) * w.w + SHAFT_X + dx;
      if (w.mat[i] === M.AIR) w.mat[i] = M.DIRT;
    }
  }

  // Old shafts from earlier cycles (Echo upgrade). The mountain remembers.
  const od = Math.min(opts.oldShaftD ?? 0, HEART_FLOOR_D - 20);
  for (let d = 1; d <= od; d++) w.mat[Y(d) * w.w + SHAFT_X] = M.AIR;

  // Glowroot: glowcaps on cave surfaces.
  for (let y = Y(38); y < Y(100); y++)
    for (let x = 1; x < w.w - 1; x++) {
      const i = y * w.w + x;
      if (w.mat[i] !== M.SLATE) continue;
      const open = w.mat[i - w.w] === M.AIR || w.mat[i + w.w] === M.AIR;
      if (open && hash3(x, y, S + 61) < 0.22) w.mat[i] = M.GLOWCAP;
    }

  // Drowned town: a street and four houses, laid out like Holloway above.
  const street = Y(TOWN_STREET_D);
  setRect(w, 3, street, w.w - 4, street + 2, M.AIR);
  setRect(w, 3, street + 3, w.w - 4, street + 3, M.BRICK);
  for (const hx of TOWN_HOUSES_X) {
    setRect(w, hx - 4, street - 7, hx + 4, street - 1, M.BRICK);
    setRect(w, hx - 3, street - 6, hx + 3, street - 1, M.AIR);
    // roof
    for (let r = 0; r < 4; r++) setRect(w, hx - 4 + r, street - 8 - r, hx + 4 - r, street - 8 - r, M.BRICK);
    // doorway onto the street
    setRect(w, hx - 1, street - 1, hx + 1, street - 1, M.AIR);
  }

  // Singing Geodes: hollow crystal-lined ellipses.
  for (let k = 0; k < 7; k++) {
    const cx = rng.int(8, w.w - 9);
    const cy = Y(rng.int(182, 244));
    const rx = rng.int(4, 7);
    const ry = rng.int(3, 5);
    ellipse(w, cx, cy, rx, ry, (x, y, e) => {
      const i = y * w.w + x;
      if (e < 0.55) w.mat[i] = M.AIR;
      else if (e < 1) w.mat[i] = M.CRYSTAL;
    });
  }

  // The Hollow Heart: a vast hollow with the shafts of earlier cycles dropping into it.
  const hc = Y(HEART_CENTER_D);
  ellipse(w, w.w / 2, hc, 26, 13, (x, y, e) => {
    if (e < 1) w.mat[y * w.w + x] = M.AIR;
  });
  for (const sx of [9, 21, 44, 55]) {
    for (let y = Y(326); y < hc; y++) if (w.mat[y * w.w + sx] !== M.AIR) w.mat[y * w.w + sx] = M.AIR;
    for (let y = Y(326); y < hc - 6; y += 3) w.objects[String(y * w.w + sx)] = 'rope';
  }
  // Heartstone mound at the floor.
  ellipse(w, w.w / 2, hc + 12, 7, 4, (x, y, e) => {
    if (e < 1) w.mat[y * w.w + x] = M.HEART;
  });
}

function placeCarvings(w: World, S: number): void {
  const Y = (d: number): number => SKY_ROWS + d;
  w.carvings = [];
  const rng = makeRng(S ^ 0xc0ffee);
  VERSE_BANDS.forEach((band, v) => {
    let x: number;
    let y: number;
    if (v >= 5 && v <= 7) {
      // inside the drowned houses, on the back wall
      x = TOWN_HOUSES_X[v - 5]! - 4;
      y = Y(TOWN_STREET_D) - 3;
    } else if (v === 11) {
      x = Math.floor(w.w / 2);
      y = Y(HEART_CENTER_D) + 8;
    } else {
      const side = v % 2 === 0 ? -1 : 1;
      x = SHAFT_X + side * rng.int(9, 20);
      x = Math.max(3, Math.min(w.w - 4, x));
      y = Y(rng.int(band.d0, band.d1));
      // bed it in solid rock so it is found by digging, not by accident
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const i = (y + dy) * w.w + x + dx;
          if (w.mat[i] === M.AIR) w.mat[i] = M.STONE;
        }
    }
    w.mat[y * w.w + x] = M.CARVING;
    w.carvings.push({ verse: v, x, y });
  });
}

function placeChests(w: World, S: number): void {
  for (let y = SKY_ROWS + 10; y < SKY_ROWS + HEART_FLOOR_D - 2; y++)
    for (let x = 2; x < w.w - 2; x++) {
      const i = y * w.w + x;
      if (w.mat[i] !== M.AIR || w.mat[i + w.w] === M.AIR || w.mat[i + w.w] === M.BEDROCK) continue;
      if (hash3(x, y, S + 77) < 0.012) w.objects[String(i)] = 'chest';
    }
}

/** The Flooded Halls start full of water. */
function floodHalls(w: World): void {
  for (let y = SKY_ROWS + 100; y < SKY_ROWS + 175; y++)
    for (let x = 1; x < w.w - 1; x++) {
      const i = y * w.w + x;
      if (w.mat[i] === M.AIR) w.water[i] = 8;
    }
}
