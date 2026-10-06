// Parser for the .sprite text format (dev-bible §4.1). Pure: used by the game and by tools/lint-sprites.

export interface SpriteDoc {
  name: string;
  palette: string;
  w: number;
  h: number;
  frames: number;
  anchor: [number, number];
  /** One string per row; frames are stacked vertically (h × frames rows). */
  rows: string[];
}

export interface PaletteFile {
  master: string[];
  palettes: Record<string, Record<string, string>>;
}

/** Sizes allowed by canon §6.3 (props: width 16–64 in steps of 16, height 8–48 in steps of 8). */
export function sizeAllowed(w: number, h: number): boolean {
  if ((w === 8 && h === 8) || (w === 16 && h === 16) || (w === 16 && h === 24)) return true;
  return w % 16 === 0 && w >= 16 && w <= 64 && h % 8 === 0 && h >= 8 && h <= 48;
}

export function parseSprite(name: string, text: string): SpriteDoc {
  const lines = text.replace(/\r/g, '').split('\n');
  const sep = lines.findIndex((l) => l.trim() === '---');
  if (sep < 0) throw new Error(`${name}: missing '---' separator`);
  const meta: Record<string, string> = {};
  for (const raw of lines.slice(0, sep)) {
    const l = raw.replace(/#.*$/, '').trim();
    if (!l) continue;
    const m = /^(\w+)\s*:\s*(.+)$/.exec(l);
    if (!m) throw new Error(`${name}: bad header line '${raw}'`);
    meta[m[1]!] = m[2]!.trim();
  }
  const size = /^(\d+)x(\d+)$/.exec(meta.size ?? '');
  if (!size) throw new Error(`${name}: missing or bad 'size'`);
  const w = Number(size[1]);
  const h = Number(size[2]);
  const frames = meta.frames ? Number(meta.frames) : 1;
  const anchor = (meta.anchor ?? `${Math.floor(w / 2)},${h - 1}`).split(',').map(Number) as [number, number];
  const rows = lines.slice(sep + 1).filter((l, i, a) => !(l === '' && i === a.length - 1));
  while (rows.length && rows[rows.length - 1] === '') rows.pop();
  return { name, palette: meta.palette ?? '', w, h, frames, anchor, rows };
}

/** Returns a list of problems; empty means the sprite is valid. */
export function lintSprite(doc: SpriteDoc, pal: PaletteFile): string[] {
  const errs: string[] = [];
  const p = pal.palettes[doc.palette];
  if (!p) errs.push(`${doc.name}: unknown palette '${doc.palette}'`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(doc.name)) errs.push(`${doc.name}: name must be kebab-case`);
  if (!sizeAllowed(doc.w, doc.h))
    errs.push(`${doc.name}: size ${doc.w}x${doc.h} is not allowed (canon §6.3)`);
  if (doc.rows.length !== doc.h * doc.frames)
    errs.push(`${doc.name}: has ${doc.rows.length} rows, expected ${doc.h * doc.frames}`);
  const master = new Set(pal.master.map((c) => c.toUpperCase()));
  if (p) {
    for (const [k, hex] of Object.entries(p))
      if (!master.has(hex.toUpperCase()))
        errs.push(`${doc.name}: palette '${doc.palette}' key '${k}' uses ${hex}, not in the master palette`);
  }
  doc.rows.forEach((r, i) => {
    if (r.length !== doc.w) errs.push(`${doc.name}: row ${i + 1} is ${r.length} wide, expected ${doc.w}`);
    if (p)
      for (const ch of r)
        if (ch !== '.' && !(ch in p)) errs.push(`${doc.name}: row ${i + 1} uses unknown key '${ch}'`);
  });
  return [...new Set(errs)];
}
