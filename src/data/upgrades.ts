// Echo upgrades: three branches of six. canon §10. Each needs the one above it in its branch.
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
  // Hands
  { id: 'steadyHands', name: 'Steady Hands', branch: 'hands', cost: 1, text: 'Hand-mining is 25% faster.' },
  {
    id: 'cheapBunks',
    name: 'Cheap Bunks',
    branch: 'hands',
    cost: 2,
    text: 'Miners cost 10% less.',
    requires: 'steadyHands',
  },
  {
    id: 'strongBacks',
    name: 'Strong Backs',
    branch: 'hands',
    cost: 6,
    text: 'Miners dig 30% faster.',
    requires: 'cheapBunks',
  },
  {
    id: 'oldCalluses',
    name: 'Old Calluses',
    branch: 'hands',
    cost: 12,
    text: 'Vein Rush builds faster (+0.35 a tile).',
    requires: 'strongBacks',
  },
  {
    id: 'heirloomPick',
    name: 'Heirloom Pick',
    branch: 'hands',
    cost: 25,
    text: 'Start each run with the pick one below your best.',
    requires: 'oldCalluses',
  },
  {
    id: 'deepHands',
    name: 'Deep Hands',
    branch: 'hands',
    cost: 60,
    text: 'Everyone digs 50% faster below 1000 ft.',
    requires: 'heirloomPick',
  },
  // Lamps
  { id: 'lamplit', name: 'Lamplit', branch: 'lamps', cost: 2, text: 'Torchlight 15% stronger.' },
  {
    id: 'steadyFlame',
    name: 'Steady Flame',
    branch: 'lamps',
    cost: 5,
    text: 'Torches no longer gutter below 150 ft.',
    requires: 'lamplit',
  },
  {
    id: 'wrensWicks',
    name: 'Wren’s Wicks',
    branch: 'lamps',
    cost: 8,
    text: 'Lanterns burn 40% less Lumen.',
    requires: 'steadyFlame',
  },
  {
    id: 'glowcapGardens',
    name: 'Glowcap Gardens',
    branch: 'lamps',
    cost: 14,
    text: 'Glowcaps give twice the spores.',
    requires: 'wrensWicks',
  },
  {
    id: 'mothWard',
    name: 'Moth Ward',
    branch: 'lamps',
    cost: 22,
    text: 'Beetles, moths and wisps come half as often.',
    requires: 'glowcapGardens',
  },
  {
    id: 'brightPages',
    name: 'Bright Pages',
    branch: 'lamps',
    cost: 45,
    text: 'The Lamp-works makes 50% more Lumen.',
    requires: 'mothWard',
  },
  // Memory
  // ADR-020: Pell's Hum comes first and cheap, so verses are easy to find from the second run on
  {
    id: 'pellsHum',
    name: 'Pell’s Hum',
    branch: 'memory',
    cost: 2,
    text: 'The nearest unfound verse glints when you are within 20 tiles.',
  },
  {
    id: 'rememberedRope',
    name: 'Remembered Rope',
    branch: 'memory',
    cost: 3,
    text: 'Start each run with the Winch lift.',
    requires: 'pellsHum',
  },
  {
    id: 'bramsLedger',
    name: 'Bram’s Ledger',
    branch: 'memory',
    cost: 9,
    text: 'Start each run with 30 copper bars and 10 tin bars.',
    requires: 'rememberedRope',
  },
  {
    id: 'oldShafts',
    name: 'Old Shafts',
    branch: 'memory',
    cost: 16,
    text: 'The shaft is already dug to half your best depth.',
    requires: 'bramsLedger',
  },
  {
    id: 'longShift',
    name: 'Long Shift',
    branch: 'memory',
    cost: 28,
    text: 'Away time counts for 16 hours, at 75%.',
    requires: 'oldShafts',
  },
  {
    id: 'surveyInstinct',
    name: 'Survey Instinct',
    branch: 'memory',
    cost: 50,
    text: 'Cave-ins give 25% more Echoes.',
    requires: 'longShift',
  },
];

export const UPGRADE_FX = {
  steadyHands: 1.25,
  cheapBunks: 0.9,
  strongBacks: 1.3,
  oldCallusesStep: 0.35,
  deepHands: 1.5,
  deepHandsFromD: 250,
  lamplit: 1.15,
  wrensWicks: 0.6,
  glowcapGardens: 2,
  mothWard: 0.5,
  brightPages: 1.5,
  pellsHumRange: 20,
  bramsLedger: { copperBar: 30, tinBar: 10 },
  oldShaftsFrac: 0.5,
  surveyInstinct: 1.25,
} as const;

/** canon §4.8 offline progress. */
export const OFFLINE = {
  capH: 8,
  eff: 0.5,
  longShift: { capH: 16, eff: 0.75 },
  /** Coarse step used to catch up, in seconds. */
  stepS: 5,
  /** Below this, a return is not worth a summary. */
  minS: 60,
};
