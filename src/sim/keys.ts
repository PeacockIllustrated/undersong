// M11-03 The keys of New Song+: small rule changes read by the systems they touch. canon §22.4
import { KEY_FX, type KeyId } from '../data/beyond';
import type { ResKey } from '../data/resources';

/** Drop multiplier for a resource in this key. */
export function keyDrop(key: KeyId | null, res: ResKey): number {
  if (key === 'rich' && KEY_FX.rich.res.includes(res)) return KEY_FX.rich.drop;
  if (key === 'hot' && KEY_FX.hot.res.includes(res)) return KEY_FX.hot.drop;
  return 1;
}

/** Rain in this key: how much more often it comes and how much longer it lasts. */
export const keyRain = (key: KeyId | null): { often: number; long: number } =>
  key === 'wet' ? { often: KEY_FX.wet.rainOften, long: KEY_FX.wet.rainLong } : { often: 1, long: 1 };
