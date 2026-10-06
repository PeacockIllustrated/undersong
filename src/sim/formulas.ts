// canon §4 formulas. Hardness and times are plain numbers; resource amounts are Decimal.
import { FT_PER_TILE } from '../data/constants';

/** canon §4.2 H(d) = H_material × (1 + d_ft / 60)^1.3 */
export function hardnessAt(hMaterial: number, depthTiles: number): number {
  const ft = Math.max(0, depthTiles) * FT_PER_TILE;
  return hMaterial * Math.pow(1 + ft / 60, 1.3);
}

/** canon §4.6 work rate of the foreman, in hardness units per second. */
export const FOREMAN_RATE = 1.15;

/** canon §4.6 seconds to hand-mine one tile. */
export function handMineSeconds(hMaterial: number, depthTiles: number, pickPower: number, mult = 1): number {
  return hardnessAt(hMaterial, depthTiles) / (pickPower * FOREMAN_RATE * mult);
}
