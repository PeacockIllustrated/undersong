import { describe, expect, it } from 'vitest';
import { lintSprite, parseSprite, type PaletteFile } from '../src/render/spriteFormat';
import paletteJson from '../assets/sprites/palette.json';

const pal = paletteJson as PaletteFile;
const head = (size = '8x8', palette = 'master'): string => `palette: ${palette}\nsize: ${size}\n---\n`;
const grid = (w: number, h: number, ch = 'a'): string => Array.from({ length: h }, () => ch.repeat(w)).join('\n');

describe('sprite lint', () => {
  it('accepts a good sprite', () => {
    expect(lintSprite(parseSprite('good-one', head() + grid(8, 8)), pal)).toEqual([]);
  });
  it('rejects an unknown palette key', () => {
    expect(lintSprite(parseSprite('bad-key', head() + grid(8, 8, '!')), pal).join()).toMatch(/unknown key/);
  });
  it('rejects a colour outside the master palette', () => {
    const p: PaletteFile = { ...pal, palettes: { ...pal.palettes, hot: { a: '#FF00FF' } } };
    expect(lintSprite(parseSprite('bad-colour', head('8x8', 'hot') + grid(8, 8)), p).join()).toMatch(/not in the master/);
  });
  it('rejects a size canon does not allow', () => {
    expect(lintSprite(parseSprite('bad-size', head('10x10') + grid(10, 10)), pal).join()).toMatch(/not allowed/);
  });
  it('rejects a ragged row', () => {
    const rows = grid(8, 7) + '\naaaa';
    expect(lintSprite(parseSprite('ragged', head() + rows), pal).join()).toMatch(/wide/);
  });
  it('rejects a bad filename', () => {
    expect(lintSprite(parseSprite('Bad_Name', head() + grid(8, 8)), pal).join()).toMatch(/kebab/);
  });
});
