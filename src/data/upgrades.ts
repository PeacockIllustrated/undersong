// Echo upgrades. canon §10 (M1 set); M2 extends the tree to three full branches.
export type Branch = 'hands' | 'lamps' | 'memory';

export interface UpgradeDef {
  id: string;
  name: string;
  branch: Branch;
  cost: number;
  text: string;
  requires?: string;
}

export const UPGRADES: readonly UpgradeDef[] = [
  { id: 'steadyHands', name: 'Steady Hands', branch: 'hands', cost: 1, text: 'Hand-mining is 25% faster.' },
  {
    id: 'cheapBunks',
    name: 'Cheap Bunks',
    branch: 'hands',
    cost: 2,
    text: 'Miners cost 10% less.',
    requires: 'steadyHands',
  },
  { id: 'lamplit', name: 'Lamplit', branch: 'lamps', cost: 2, text: 'Torchlight carries 15% further.' },
  {
    id: 'rememberedRope',
    name: 'Remembered Rope',
    branch: 'memory',
    cost: 3,
    text: 'Start each run with the Winch lift.',
  },
  {
    id: 'pellsHum',
    name: 'Pell’s Hum',
    branch: 'memory',
    cost: 5,
    text: 'The nearest unfound verse glints when you are within 20 tiles.',
    requires: 'rememberedRope',
  },
];

export const UPGRADE_FX = {
  steadyHands: 1.25,
  cheapBunks: 0.9,
  lamplit: 1.15,
  pellsHumRange: 20,
} as const;
