// M8-03: the words under a price the player can't pay yet.
import { RES_NAMES, type ResKey } from '../data/resources';

export function readyText(r: { secs: number } | { needs: ResKey }): string {
  if ('needs' in r) return `needs ${RES_NAMES[r.needs].toLowerCase()}`;
  const s = Math.ceil(r.secs);
  if (s < 60) return `ready in ${s} s`;
  const m = Math.round(s / 60);
  return m < 60 ? `ready in ${m} min` : `ready in ${Math.floor(m / 60)} h ${m % 60} min`;
}

export const BULK_LABEL: Record<string, string> = { '1': '×1', '10': '×10', max: 'Max' };
