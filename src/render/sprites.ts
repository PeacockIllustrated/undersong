// Runtime sprite atlas: every .sprite file is parsed and drawn to its own small canvas at startup.
import { parseSprite, type PaletteFile, type SpriteDoc } from './spriteFormat';
import paletteJson from '../../assets/sprites/palette.json';

const files = import.meta.glob('../../assets/sprites/**/*.sprite', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export interface Sprite {
  doc: SpriteDoc;
  /** One canvas per frame. */
  frames: HTMLCanvasElement[];
}

const palette = paletteJson as PaletteFile;
const cache = new Map<string, Sprite>();

function build(doc: SpriteDoc): Sprite {
  const pal = palette.palettes[doc.palette] ?? {};
  const frames: HTMLCanvasElement[] = [];
  for (let f = 0; f < doc.frames; f++) {
    const c = document.createElement('canvas');
    c.width = doc.w;
    c.height = doc.h;
    const x = c.getContext('2d')!;
    for (let y = 0; y < doc.h; y++) {
      const row = doc.rows[f * doc.h + y] ?? '';
      for (let i = 0; i < doc.w; i++) {
        const ch = row[i];
        const col = ch && ch !== '.' ? pal[ch] : undefined;
        if (col) {
          x.fillStyle = col;
          x.fillRect(i, y, 1, 1);
        }
      }
    }
    frames.push(c);
  }
  return { doc, frames };
}

export function loadSprites(): void {
  for (const [path, text] of Object.entries(files)) {
    const name = path.split('/').pop()!.replace('.sprite', '');
    cache.set(name, build(parseSprite(name, text)));
  }
}

export function sprite(name: string): Sprite {
  const s = cache.get(name);
  if (!s) throw new Error(`Unknown sprite '${name}'`);
  return s;
}

export function hasSprite(name: string): boolean {
  return cache.has(name);
}

export function spriteNames(): string[] {
  return [...cache.keys()].sort();
}

/** Draw a sprite frame with its anchor at (x, y), in art pixels, onto a context already scaled. */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  name: string,
  frame: number,
  x: number,
  y: number,
  flip = false,
): void {
  const s = cache.get(name);
  if (!s) return;
  const f = s.frames[((frame % s.frames.length) + s.frames.length) % s.frames.length]!;
  const ax = s.doc.anchor[0];
  const ay = s.doc.anchor[1];
  if (flip) {
    ctx.save();
    ctx.translate(Math.round(x), 0);
    ctx.scale(-1, 1);
    ctx.drawImage(f, -(s.doc.w - ax), Math.round(y - ay));
    ctx.restore();
  } else ctx.drawImage(f, Math.round(x - ax), Math.round(y - ay));
}

/** Data URL of a frame, for UI icons. */
const urlCache = new Map<string, string>();
export function spriteURL(name: string, frame = 0): string {
  const k = `${name}#${frame}`;
  let u = urlCache.get(k);
  if (!u) {
    const s = cache.get(name);
    u = s ? s.frames[frame % s.frames.length]!.toDataURL() : '';
    urlCache.set(k, u);
  }
  return u;
}

/** M10-04: a sprite's window panes, as offsets from its anchor: each 'z' pane just right of an 'a' frame, 3 × 2. */
const paneCache = new Map<string, [number, number][]>();
export function windowPanes(name: string): [number, number][] {
  let out = paneCache.get(name);
  if (out) return out;
  out = [];
  const s = cache.get(name);
  if (s) {
    const { rows, w, h, anchor } = s.doc;
    for (let y = 0; y < h - 1; y++)
      for (let x = 1; x < w - 2; x++)
        if (rows[y]![x - 1] === 'a' && rows[y]![x] === 'z' && rows[y + 1]![x - 1] === 'a')
          for (let dy = 0; dy < 2; dy++)
            for (let dx = 0; dx < 3; dx++) out.push([x + dx - anchor[0], y + dy - anchor[1]]);
  }
  paneCache.set(name, out);
  return out;
}
