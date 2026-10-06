// Picks and haulage tiers. canon §9 (and later acts).
import type { ResKey } from './resources';

export interface Cost {
  res: ResKey;
  n: number;
}

export interface PickDef {
  name: string;
  sprite: string;
  power: number;
  cost: Cost[];
}

export const PICKS: readonly PickDef[] = [
  { name: 'Wooden pick', sprite: 'pick-wood', power: 1, cost: [] },
  { name: 'Copper pick', sprite: 'pick-copper', power: 2, cost: [{ res: 'copperBar', n: 10 }] },
  { name: 'Bronze pick', sprite: 'pick-bronze', power: 3, cost: [{ res: 'bronzeBar', n: 25 }] },
];
