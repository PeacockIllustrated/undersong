// Number formatting for the HUD.
import type { Decimal } from '../sim/decimal';

const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function fmt(d: Decimal): string {
  if (d.lt(1000))
    return d.lt(10) && !d.eq(d.floor()) ? d.toNumber().toFixed(1) : String(Math.floor(d.toNumber()));
  const e = Math.floor(d.log10().toNumber() / 3);
  if (e < SUFFIX.length)
    return (d.toNumber() / Math.pow(1000, e)).toFixed(2).replace(/\.?0+$/, '') + SUFFIX[e];
  return d.toExponential(2).replace('+', '');
}
