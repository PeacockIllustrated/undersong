// M7-03: the words on the hover label.
import { RES_NAMES } from '../data/resources';
import type { TileInfo } from '../sim/inspect';

export function hoverLines(i: TileInfo): { head: string; sub: string; warn: boolean } {
  if (i.needs) return { head: i.name, sub: `Needs the ${i.needs}`, warn: true };
  const t = i.secs === undefined ? '' : i.secs < 10 ? `${i.secs.toFixed(1)}s` : `${Math.round(i.secs)}s`;
  const drop = i.drop && i.drop !== 'rubble' ? RES_NAMES[i.drop] : '';
  return { head: i.name, sub: [t && `Foreman ${t}`, drop].filter(Boolean).join(' · '), warn: false };
}
