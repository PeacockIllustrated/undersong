// Holloway & Co.: every tunable number for the hybrid. Mirrored in docs/hybrid/canon.md. Values are v0.
import { M } from '../../data/materials';

/** Fixed simulation step: 60 Hz, so the Foreman's platforming is smooth and deterministic (ADR-H006). */
export const STEP_S = 1 / 60;
export const MAX_STEPS_PER_FRAME = 8;

export const SAVE_KEY = 'hollowayco.save';
export const SAVE_VERSION = 3;

/** hybrid canon §2: the day. */
export const DAY = {
  /** Seconds from dawn to dusk before upgrades. */
  baseS: 180,
  /** Lantern Hours: seconds added per level, and the most levels. */
  hourS: 20,
  hourMax: 6,
  /** The last bell rings this many seconds before dusk. */
  lastBellS: 20,
  /** Coal still in the pack at dusk is banked at this share. */
  lateTally: 0.5,
  /** How long the tally is read at dusk before the night screen (render only). */
  duskS: 2.4,
} as const;

/** hybrid canon §3: the quota. Q(d) = base × growth^(d−1); audit days × audit; days 1–softDays × soft. */
export const QUOTA = {
  base: 45,
  growth: 1.45,
  auditEvery: 7,
  audit: 1.6,
  softDays: 3,
  soft: 0.75,
} as const;

/** hybrid canon §4: the Foreman's body, in tiles and seconds. */
export const BODY = {
  w: 0.7,
  h: 1.45,
  gravity: 52,
  maxFall: 24,
  run: 6,
  accel: 60,
  airAccel: 34,
  friction: 50,
  /** Jump speed for about 3.2 tiles of height: sqrt(2 g h). */
  jump: 18.2,
  /** Letting go of jump early cuts the rise to this share. */
  jumpCut: 0.45,
  coyoteS: 0.1,
  bufferS: 0.12,
  climb: 5.5,
  /** Water (level ≥ 4): gravity share, top sink speed, and the stroke upward. */
  swimGravity: 0.3,
  swimFall: 4,
  swimStroke: 7,
  /** Jetpack: upward push while held, and fuel seconds per level. */
  jetPush: 80,
  jetMaxRise: 9,
  jetFuelS: 1.6,
} as const;

/** hybrid canon §5: digging. seconds per tile = H(d) / (pickPower × DIG.k × handMult). */
export const DIG = {
  k: 4,
  /** How far the pick reaches from the Foreman's chest, in tiles. */
  reach: 2.6,
  /** Vein Rush: drops × min(rushMax, 1 + rushStep × chain) for ore and coal broken next to the last one. */
  rushStep: 0.25,
  rushMax: 3,
  rushIdleS: 1.5,
} as const;

/** canon §4.2 rock hardness at depth, reused as is. */
export const hardnessAt = (h: number, depthFt: number): number =>
  h * Math.pow(1 + Math.max(0, depthFt) / 60, 1.3);

/** hybrid canon §17 (ADR-H009): every ore has a job. Coal fills the quota; each ore is stocked and spent at night. */
export type OreId =
  'copper' | 'tin' | 'iron' | 'glowcap' | 'silver' | 'aqua' | 'crystal' | 'ember' | 'gold' | 'heart';
export interface OreDef {
  name: string;
  /** Item sprite for the HUD, the store and the tally. */
  sprite: string;
  /** What the ore is for, in a few words. */
  job: string;
}
export const ORES: Record<OreId, OreDef> = {
  copper: { name: 'Copper', sprite: 'chunk-copper', job: 'Picks and whetstones' },
  tin: { name: 'Tin', sprite: 'chunk-tin', job: 'Bronze, packs and charge casings' },
  iron: { name: 'Iron', sprite: 'chunk-iron', job: 'Picks, ladders, rails and boots' },
  glowcap: { name: 'Glowcap', sprite: 'spores', job: 'Lantern oil: longer days' },
  silver: { name: 'Silver', sprite: 'chunk-silver', job: 'Picks and deputies’ badges' },
  aqua: { name: 'Aquamarine', sprite: 'chunk-aqua', job: 'Picks and jetpack fuel' },
  crystal: { name: 'Crystal', sprite: 'chunk-crystal', job: 'Picks and spring boots' },
  ember: { name: 'Ember ore', sprite: 'chunk-ember', job: 'Picks and bigger blasts' },
  gold: { name: 'Gold', sprite: 'chunk-gold', job: 'Sells for scrip at the kibble' },
  heart: { name: 'Heartstone', sprite: 'chunk-heart', job: 'The last picks, and an Echo each' },
};
export const ORE_IDS = Object.keys(ORES) as OreId[];

/** What a broken tile puts in the pack: coal for the quota, or one ore. */
export type Drop = { kind: 'coal'; n: number } | { kind: 'ore'; ore: OreId; n: number };

export const DROPS: Partial<Record<number, Drop>> = {
  [M.COAL]: { kind: 'coal', n: 2 },
  [M.COPPER]: { kind: 'ore', ore: 'copper', n: 1 },
  [M.TIN]: { kind: 'ore', ore: 'tin', n: 1 },
  [M.GLOWCAP]: { kind: 'ore', ore: 'glowcap', n: 1 },
  [M.IRON]: { kind: 'ore', ore: 'iron', n: 1 },
  [M.SILVER]: { kind: 'ore', ore: 'silver', n: 1 },
  [M.AQUA]: { kind: 'ore', ore: 'aqua', n: 1 },
  [M.CRYSTAL]: { kind: 'ore', ore: 'crystal', n: 1 },
  [M.EMBER]: { kind: 'ore', ore: 'ember', n: 1 },
  [M.GOLD]: { kind: 'ore', ore: 'gold', n: 1 },
  [M.HEART]: { kind: 'ore', ore: 'heart', n: 1 },
};

/** Gold sells at the kibble for this much scrip each. Each heartstone banked pays this many Echoes at the Cave-in. */
export const GOLD_SCRIP = 60;
export const HEART_ECHOES = 1;

/** hybrid canon §17: the hybrid's pick ladder, 16 tiers. `gate` is the Undersong tier it digs as (MIN_PICK). */
export interface CoPick {
  name: string;
  sprite: string;
  power: number;
  gate: number;
  scrip: number;
  ores: readonly { id: OreId; n: number }[];
}
export const CO_PICKS: readonly CoPick[] = [
  { name: 'Wooden pick', sprite: 'copick-wood', power: 1, gate: 0, scrip: 0, ores: [] },
  {
    name: 'Copper pick',
    sprite: 'copick-copper',
    power: 2,
    gate: 1,
    scrip: 40,
    ores: [{ id: 'copper', n: 8 }],
  },
  {
    name: 'Bronze pick',
    sprite: 'copick-bronze',
    power: 3,
    gate: 2,
    scrip: 110,
    ores: [
      { id: 'copper', n: 6 },
      { id: 'tin', n: 6 },
    ],
  },
  { name: 'Iron pick', sprite: 'copick-iron', power: 5, gate: 3, scrip: 300, ores: [{ id: 'iron', n: 10 }] },
  { name: 'Steel pick', sprite: 'copick-steel', power: 7, gate: 3, scrip: 700, ores: [{ id: 'iron', n: 25 }] },
  {
    name: 'Silver pick',
    sprite: 'copick-silver',
    power: 10,
    gate: 4,
    scrip: 1600,
    ores: [{ id: 'silver', n: 12 }],
  },
  {
    name: 'Cobalt pick',
    sprite: 'copick-cobalt',
    power: 14,
    gate: 4,
    scrip: 3500,
    ores: [
      { id: 'silver', n: 25 },
      { id: 'iron', n: 30 },
    ],
  },
  {
    name: 'Aquamarine pick',
    sprite: 'copick-aqua',
    power: 19,
    gate: 5,
    scrip: 8000,
    ores: [{ id: 'aqua', n: 12 }],
  },
  {
    name: 'Jade pick',
    sprite: 'copick-jade',
    power: 25,
    gate: 5,
    scrip: 18000,
    ores: [
      { id: 'aqua', n: 25 },
      { id: 'glowcap', n: 20 },
    ],
  },
  {
    name: 'Crystal pick',
    sprite: 'copick-crystal',
    power: 33,
    gate: 6,
    scrip: 40000,
    ores: [{ id: 'crystal', n: 12 }],
  },
  {
    name: 'Obsidian pick',
    sprite: 'copick-obsidian',
    power: 44,
    gate: 6,
    scrip: 90000,
    ores: [
      { id: 'crystal', n: 25 },
      { id: 'silver', n: 40 },
    ],
  },
  {
    name: 'Ember pick',
    sprite: 'copick-ember',
    power: 58,
    gate: 7,
    scrip: 2e5,
    ores: [{ id: 'ember', n: 12 }],
  },
  {
    name: 'Sunsteel pick',
    sprite: 'copick-sunsteel',
    power: 76,
    gate: 7,
    scrip: 4.5e5,
    ores: [
      { id: 'ember', n: 25 },
      { id: 'glowcap', n: 40 },
    ],
  },
  {
    name: 'Heart pick',
    sprite: 'copick-heart',
    power: 100,
    gate: 8,
    scrip: 1e6,
    ores: [
      { id: 'ember', n: 40 },
      { id: 'crystal', n: 40 },
    ],
  },
  {
    name: 'Moonsilver pick',
    sprite: 'copick-moonsilver',
    power: 140,
    gate: 8,
    scrip: 2.3e6,
    ores: [{ id: 'heart', n: 10 }],
  },
  {
    name: 'Songsteel pick',
    sprite: 'copick-songsteel',
    power: 200,
    gate: 8,
    scrip: 5e6,
    ores: [
      { id: 'heart', n: 25 },
      { id: 'crystal', n: 60 },
    ],
  },
];

/** hybrid canon §6: coal seams laid over Undersong's generator. Higher threshold = rarer. */
export const SEAMS = {
  /** fbm threshold for coal, stretched sideways so seams run in long bands. */
  threshold: 0.6,
  sx: 0.11,
  sy: 0.34,
  /** Seams start this many tiles below the grass. */
  fromD: 2,
  /** Seams replace only these host rocks. */
  hosts: [M.DIRT, M.STONE, M.SLATE, M.SINGING, M.BASALT] as readonly number[],
} as const;

/** hybrid canon §7: the shaft at the headframe and the kibble where coal is tallied. */
export const SHAFT = {
  baseDepth: 8,
  depthStep: 8,
  /** The kibble takes a deposit from anyone within this many tiles of the shaft top. */
  kibbleReach: 2.6,
} as const;

/** hybrid canon §8: crews. A hand digs coal/s = rate × sqrt(pickPower); deputies lead 10 hands each. */
export const CREW = {
  rate: 0.2,
  deputyGang: 10,
  deputyBoost: 0.5,
  /** Gangs shown digging in the mine: one per this many hands, at most `shown`. */
  perGang: 5,
  shown: 8,
  /** Tiles a shown gang digs per second. Coal they break adds to the crew rate; ore they break goes to stock. */
  gangDig: 0.35,
  /** How far a gang looks for coal or ore to tunnel to, and how far it strays from its own row. */
  seek: 7,
  band: 4,
} as const;

/** Every verse ever found speeds every crew by this much. canon §4.13 */
export const VERSE_POWER = 0.05;
/** Every Echo ever earned adds this much to every crew and to hand digging. */
export const ECHO_POWER = 0.01;

/** hybrid canon §9: the Company Store at night. cost(n) = base × growth^n, in scrip. */
export interface ShopDef {
  id: ShopId;
  name: string;
  blurb: string;
  base: number;
  growth: number;
  max?: number;
  /** Shown only from this day on. */
  fromDay?: number;
  /** The ore the item also needs: base × growth^level of it (ADR-H009). */
  ore?: { id: OreId; base: number; growth: number };
}

export type ShopId =
  | 'hand'
  | 'deputy'
  | 'pick'
  | 'whetstone'
  | 'boots'
  | 'pack'
  | 'hours'
  | 'shaft'
  | 'footKibble'
  | 'ladders'
  | 'charges'
  | 'blast'
  | 'doubleJump'
  | 'jetpack';

export const SHOP: readonly ShopDef[] = [
  { id: 'hand', name: 'Hire a hand', blurb: 'Digs coal all day and sends it up', base: 18, growth: 1.22 },
  {
    id: 'pick',
    name: 'Better pick',
    blurb: 'Digs faster and breaks harder rock',
    base: 0,
    growth: 1,
    max: 15,
  },
  {
    id: 'whetstone',
    name: 'Whetstone',
    blurb: '+20% digging by hand',
    base: 25,
    growth: 1.45,
    ore: { id: 'copper', base: 3, growth: 1.4 },
  },
  {
    id: 'pack',
    name: 'Bigger pack',
    blurb: '+40% carried before you must go up',
    base: 30,
    growth: 1.6,
    max: 10,
    ore: { id: 'tin', base: 4, growth: 1.4 },
  },
  {
    id: 'boots',
    name: 'Pit boots',
    blurb: '+10% run speed',
    base: 40,
    growth: 1.7,
    max: 6,
    ore: { id: 'iron', base: 3, growth: 1.4 },
  },
  {
    id: 'hours',
    name: 'Lantern Hours',
    blurb: '+20 s on every day',
    base: 60,
    growth: 1.9,
    max: DAY.hourMax,
    ore: { id: 'glowcap', base: 3, growth: 1.6 },
  },
  {
    id: 'ladders',
    name: 'Ladder bundle',
    blurb: '+10 ladders each morning (F)',
    base: 20,
    growth: 1.8,
    max: 6,
    ore: { id: 'iron', base: 2, growth: 1.3 },
  },
  {
    id: 'shaft',
    name: 'Sink the shaft',
    blurb: '+8 tiles of ladder down the shaft',
    base: 50,
    growth: 1.75,
    max: 12,
    ore: { id: 'iron', base: 4, growth: 1.45 },
  },
  {
    id: 'deputy',
    name: 'Promote a deputy',
    blurb: 'Leads 10 hands: +50% from them',
    base: 60,
    growth: 1.55,
    fromDay: 2,
    ore: { id: 'silver', base: 3, growth: 1.5 },
  },
  {
    id: 'charges',
    name: 'Blast charges',
    blurb: '+3 charges each morning (E or right click)',
    base: 80,
    growth: 1.9,
    max: 8,
    fromDay: 2,
    ore: { id: 'tin', base: 3, growth: 1.4 },
  },
  {
    id: 'blast',
    name: 'Bigger blasts',
    blurb: 'Charges clear a wider hole',
    base: 200,
    growth: 2.6,
    max: 3,
    fromDay: 3,
    ore: { id: 'ember', base: 4, growth: 2 },
  },
  {
    id: 'doubleJump',
    name: 'Spring boots',
    blurb: 'Jump again in mid-air',
    base: 150,
    growth: 1,
    max: 1,
    fromDay: 2,
    ore: { id: 'crystal', base: 8, growth: 1 },
  },
  {
    id: 'footKibble',
    name: 'Kibble at the shaft foot',
    blurb: 'Deposit at the bottom of the shaft too',
    base: 300,
    growth: 1,
    max: 1,
    fromDay: 3,
    ore: { id: 'iron', base: 20, growth: 1 },
  },
  {
    id: 'jetpack',
    name: 'Jetpack',
    blurb: 'Hold jump to fly. More levels, more fuel',
    base: 900,
    growth: 2.4,
    max: 5,
    fromDay: 4,
    ore: { id: 'aqua', base: 8, growth: 1.8 },
  },
];

export const UPGRADE = {
  whetstone: 0.2,
  boots: 0.1,
  pack: 0.4,
  ladders: 10,
  charges: 3,
} as const;

/** hybrid canon §10: the Foreman's kit at dawn before upgrades. */
export const KIT = {
  pack: 24,
  ladders: 8,
  charges: 0,
  blastRadius: 1,
  fuseS: 1.1,
  throwSpeed: 13,
} as const;

/** hybrid canon §11: chests. Scrip = base × (1 + depthTiles / depthDiv); relic chance. */
export const CHEST = { base: 15, depthDiv: 12, relic: 0.3 } as const;

export type RelicId = 'wick' | 'ring' | 'button' | 'flask' | 'collar' | 'pen' | 'boots' | 'lamp';
export const RELICS: Record<RelicId, { name: string; blurb: string }> = {
  wick: { name: "Wren's spare wick", blurb: 'Your lamp reaches twice as far' },
  ring: { name: "Bram's thumb ring", blurb: '+30% digging by hand' },
  button: { name: "Pell's lucky button", blurb: 'Chests pay double' },
  flask: { name: "Tansy's flask", blurb: '+15 s on every day' },
  collar: { name: "Biscuit's old collar", blurb: '+30% pack' },
  pen: { name: "The Tallyman's pen", blurb: 'Every quota is 10% smaller' },
  boots: { name: "Rook's boots", blurb: '+15% run speed' },
  lamp: { name: 'Old miner’s lamp', blurb: 'Ore sells for 25% more' },
};

/** hybrid canon §14 (ADR-H008): shift grades at dusk. Deposited ÷ quota at or above `at` earns the grade; it pays quota × bonus scrip. */
export const GRADES = [
  { at: 3, name: 'Record shift', bonus: 2 },
  { at: 2, name: 'Bumper shift', bonus: 1 },
  { at: 1.5, name: 'Good shift', bonus: 0.4 },
  { at: 1, name: 'Quota met', bonus: 0 },
] as const;

/** hybrid canon §14: each met quota in a row multiplies surplus and grade scrip by 1 + step × (streak − 1), up to max. */
export const STREAK = { step: 0.15, max: 3 } as const;

/** hybrid canon §15: gems in chests below minDepth tiles. Value × (1 + depth / depthDiv) scrip, picked by weight. */
export type GemId = 'topaz' | 'ruby' | 'sapphire' | 'emerald' | 'moonstone' | 'diamond';
export const GEMS: Record<GemId, { name: string; scrip: number; weight: number }> = {
  topaz: { name: 'Topaz', scrip: 80, weight: 5 },
  ruby: { name: 'Ruby', scrip: 150, weight: 4 },
  sapphire: { name: 'Sapphire', scrip: 250, weight: 3 },
  emerald: { name: 'Emerald', scrip: 400, weight: 2 },
  moonstone: { name: 'Moonstone', scrip: 700, weight: 1.2 },
  diamond: { name: 'Diamond', scrip: 1500, weight: 0.6 },
};
export const GEM = { minDepth: 10, chance: 0.5, depthDiv: 20 } as const;

/** hybrid canon §16: the tinker's cart at night. A relic costs base × growth^(relics owned); a reroll reroll × rerollGrowth^(rerolls tonight). */
export const TINKER = {
  offers: 3,
  base: 60,
  growth: 2.2,
  reroll: 15,
  rerollGrowth: 1.6,
  fromDay: 1,
} as const;

/** hybrid canon §12: Echoes at a Cave-in. max(min, floor( sqrt(coal / div) × (1 + perDay × days) × (1 + perVerse × verses) )), and 0 if no coal went up. */
export const ECHO = { div: 20, perDay: 0.15, perVerse: 0.25, min: 1 } as const;

/** hybrid canon §13: the Survey Book's Union branch. cost(l) = base × growth^l Echoes. */
export type BookId =
  'steady' | 'oldHands' | 'longLight' | 'strike' | 'pardon' | 'pockets' | 'union' | 'ledger';
export interface BookDef {
  id: BookId;
  name: string;
  blurb: string;
  base: number;
  growth: number;
  max?: number;
}
export const BOOK: readonly BookDef[] = [
  { id: 'steady', name: 'Steady Hands', blurb: '+20% digging by hand', base: 1, growth: 2 },
  { id: 'pockets', name: 'Deep Pockets', blurb: '+25% pack', base: 1, growth: 2 },
  { id: 'oldHands', name: 'Old Hands', blurb: 'Start each contract with 3 more hands', base: 2, growth: 2 },
  {
    id: 'ledger',
    name: "Bram's Ledger",
    blurb: 'Start each contract with scrip: 50, ×3 a level',
    base: 2,
    growth: 2.2,
  },
  { id: 'strike', name: 'Strike Fund', blurb: '+25% scrip from everything', base: 2, growth: 2 },
  { id: 'union', name: 'Union Card', blurb: '+25% from every crew', base: 3, growth: 2 },
  { id: 'longLight', name: 'Long Light', blurb: '+15 s on every day', base: 3, growth: 2.2, max: 4 },
  {
    id: 'pardon',
    name: 'Overtime Pardon',
    blurb: 'Forgive one missed quota per contract',
    base: 10,
    growth: 4,
    max: 2,
  },
];
export const BOOK_FX = {
  steady: 0.2,
  pockets: 0.25,
  oldHands: 3,
  ledger: 50,
  ledgerGrowth: 3,
  strike: 0.25,
  union: 0.25,
  longLight: 15,
} as const;

/** Time away pays the crew's day rate as scrip at this share, for at most capH hours (night-shift pay). */
export const AWAY = { share: 0.25, capH: 8, minS: 60 } as const;
