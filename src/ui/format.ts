// Number formatting for the HUD.
import { D, type Decimal } from '../sim/decimal';
import { settings } from '../settings';

const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function fmt(d: Decimal): string {
  if (d.lt(1000))
    return d.lt(10) && !d.eq(d.floor()) ? d.toNumber().toFixed(1) : String(Math.floor(d.toNumber()));
  // Settings: scientific notation from a thousand up, for players who prefer it (ADR-024)
  if (settings().numbers === 'scientific') return d.toExponential(2).replace('+', '');
  const e = Math.floor(d.log10().toNumber() / 3);
  if (e < SUFFIX.length)
    return (d.toNumber() / Math.pow(1000, e)).toFixed(2).replace(/\.?0+$/, '') + SUFFIX[e];
  return d.toExponential(2).replace('+', '');
}

/** M8-05: a plain number as players read it: whole above 10, one decimal below, never a trailing ".0". */
export function num(x: number): string {
  if (x >= 1000) return fmt(D(x));
  return (x >= 10 ? Math.round(x) : Math.round(x * 10) / 10).toString();
}

/** A per-second rate as "N a minute". */
export const perMin = (perSec: number): string => `${num(perSec * 60)} a minute`;

/** A multiplier to two places, trimmed: 1.25, 1.5, 2. */
export const mult = (x: number): string => x.toFixed(2).replace(/\.?0+$/, '');
