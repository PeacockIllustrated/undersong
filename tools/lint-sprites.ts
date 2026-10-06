// npm run lint:sprites — enforces dev-bible §4.2 on every assets/sprites/**/*.sprite
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { lintSprite, parseSprite, type PaletteFile } from '../src/render/spriteFormat';

const ROOT = 'assets/sprites';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.sprite') ? [p] : [];
  });
}

export function lintAll(root = ROOT): string[] {
  const pal = JSON.parse(readFileSync(join(root, 'palette.json'), 'utf8')) as PaletteFile;
  const errs: string[] = [];
  const seen = new Set<string>();
  for (const file of walk(root)) {
    const name = basename(file, '.sprite');
    if (seen.has(name)) errs.push(`${name}: duplicate sprite name`);
    seen.add(name);
    try {
      errs.push(...lintSprite(parseSprite(name, readFileSync(file, 'utf8')), pal));
    } catch (e) {
      errs.push((e as Error).message);
    }
  }
  return errs;
}

if (process.argv[1]?.endsWith('lint-sprites.ts')) {
  const errs = lintAll();
  if (errs.length) {
    for (const e of errs) console.error('✗ ' + e);
    console.error(`\n${errs.length} sprite problem(s).`);
    process.exit(1);
  }
  console.log(`✓ sprites OK (${walk(ROOT).length} files)`);
}
