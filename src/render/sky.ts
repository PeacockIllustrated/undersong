// M10-04: the sky over Holloway: day, dusk, night and dawn on an eight-minute cycle, and the rain. Render only.
import { SKY } from '../data/finds';

/** How dark the surface is now, 0 (day) to 1 (full night), from the run clock. */
export function nightness(totalMs: number): number {
  const p = (totalMs % SKY.cycleMs) / SKY.cycleMs;
  const ramp = (a: number, b: number): number => Math.min(1, Math.max(0, (p - a) / (b - a)));
  if (p < SKY.dusk) return 0;
  if (p < SKY.night) return ramp(SKY.dusk, SKY.night);
  if (p < SKY.dawn) return 1;
  if (p < SKY.day) return 1 - ramp(SKY.dawn, SKY.day);
  return 0;
}

/** Dusk and dawn warm the sky a little: 0 outside them, 1 at their middle. */
export function glow(totalMs: number): number {
  const p = (totalMs % SKY.cycleMs) / SKY.cycleMs;
  const bump = (a: number, b: number): number =>
    p >= a && p < b ? Math.sin(((p - a) / (b - a)) * Math.PI) : 0;
  return Math.max(bump(SKY.dusk, SKY.night), bump(SKY.dawn, SKY.day));
}
