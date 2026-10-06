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
  { name: 'Iron pick', sprite: 'pick-iron', power: 5, cost: [{ res: 'ironBar', n: 15 }] },
  {
    name: 'Silver pick',
    sprite: 'pick-silver',
    power: 8,
    // all silver: iron is spent by the time the village reaches the Halls (ADR-021)
    cost: [{ res: 'silverBar', n: 40 }],
  },
  {
    name: 'Aquamarine pick',
    sprite: 'pick-aqua',
    power: 12,
    // mostly aquamarine: by the Geodes the Halls' silver has run thin (M3-09)
    cost: [
      { res: 'aquamarine', n: 30 },
      { res: 'silverBar', n: 20 },
    ],
  },
  {
    name: 'Crystal pick',
    sprite: 'pick-crystal',
    power: 18,
    cost: [
      { res: 'crystal', n: 40 },
      { res: 'silverBar', n: 30 },
    ],
  },
  {
    name: 'Ember pick',
    sprite: 'pick-ember',
    power: 27,
    cost: [
      { res: 'emberOre', n: 40 },
      { res: 'goldBar', n: 30 },
    ],
  },
  {
    name: 'Heart pick',
    sprite: 'pick-heart',
    power: 40,
    cost: [
      { res: 'heartstone', n: 20 },
      { res: 'goldBar', n: 50 },
    ],
  },
];
