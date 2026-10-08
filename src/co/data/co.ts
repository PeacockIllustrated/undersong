// Holloway & Co.: every tunable number for the hybrid. Mirrored in docs/hybrid/canon.md. Values are v0.
import { M } from '../../data/materials';

/** Fixed simulation step: 60 Hz, so the Foreman's platforming is smooth and deterministic (ADR-H006). */
export const STEP_S = 1 / 60;
export const MAX_STEPS_PER_FRAME = 8;

export const SAVE_KEY = 'hollowayco.save';
export const SAVE_VERSION = 4;

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

/** Hot rock: the cold lance cuts it fast, and heat (H5) rises from it. */
export const HOT: readonly number[] = [M.EMBER, M.BASALT, M.GOLD, M.HEART, M.HEARTWALL];

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
  {
    name: 'Steel pick',
    sprite: 'copick-steel',
    power: 7,
    gate: 3,
    scrip: 700,
    ores: [{ id: 'iron', n: 25 }],
  },
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
  shown: 40,
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
  | 'jetpack'
  | 'putter'
  | 'shotfirer'
  | 'lampman'
  | 'pumpman'
  | 'scatter'
  | 'mortar'
  | 'drill'
  | 'lance';

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
    id: 'putter',
    name: 'Promote a putter',
    blurb: 'Hauls what your full pack leaves behind',
    base: 40,
    growth: 1.3,
    fromDay: 2,
    ore: { id: 'tin', base: 2, growth: 1.25 },
  },
  {
    id: 'lampman',
    name: 'Promote a lampman',
    blurb: '+12% from the crew: lit faces dig faster',
    base: 55,
    growth: 1.32,
    fromDay: 3,
    ore: { id: 'glowcap', base: 2, growth: 1.3 },
  },
  {
    id: 'shotfirer',
    name: 'Promote a shotfirer',
    blurb: 'Gangs blast one rock harder and tunnel faster',
    base: 90,
    growth: 1.4,
    fromDay: 3,
    ore: { id: 'iron', base: 3, growth: 1.3 },
  },
  {
    id: 'pumpman',
    name: 'Promote a pumpman',
    blurb: 'Drains flooded tunnels near the shaft each dawn',
    base: 70,
    growth: 1.3,
    fromDay: 4,
    ore: { id: 'copper', base: 3, growth: 1.3 },
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
  {
    id: 'scatter',
    name: 'Scatter pick',
    blurb: 'Hits a cone of rock (2). Aim down in the air to rocket-jump',
    base: 120,
    growth: 1.9,
    max: 5,
    fromDay: 3,
    ore: { id: 'iron', base: 6, growth: 1.5 },
  },
  {
    id: 'mortar',
    name: 'Mortar',
    blurb: 'Lobs a shell at a far face (3). Bursts through water',
    base: 260,
    growth: 1.9,
    max: 5,
    fromDay: 4,
    ore: { id: 'silver', base: 5, growth: 1.5 },
  },
  {
    id: 'drill',
    name: 'Drill rig',
    blurb: 'Set it down (4) and it drills straight down on its own',
    base: 400,
    growth: 2,
    max: 5,
    fromDay: 5,
    ore: { id: 'iron', base: 15, growth: 1.5 },
  },
  {
    id: 'lance',
    name: 'Cold lamp lance',
    blurb: 'Cuts hot rock fast (5) and keeps the heat off you',
    base: 900,
    growth: 2.2,
    max: 3,
    fromDay: 6,
    ore: { id: 'aqua', base: 6, growth: 1.6 },
  },
];

/** hybrid canon §8.1: the promotion ladder. A promotion turns one hand into a role; roles never outnumber hands. */
export const ROLE_IDS = ['putter', 'shotfirer', 'lampman', 'pumpman', 'deputy'] as const;
export const ROLE_FX = {
  /** Spill (coal or ore that did not fit in the pack) each putter hauls to the kibble a second. */
  putterHaul: 0.6,
  /** With any shotfirer, gangs break one tier harder; each shotfirer speeds a gang's tunnelling by this much. */
  shotfirerDig: 0.3,
  /** Each lampman adds this much to the crew rate, for at most one lampman per `lampPer` hands. */
  lampman: 0.12,
  lampPer: 5,
  /** Water tiles each pumpman drains near the shaft at dawn, and the crew bonus in flooded rows. */
  pumpTiles: 60,
} as const;

export const UPGRADE = {
  whetstone: 0.2,
  boots: 0.1,
  pack: 0.4,
  ladders: 10,
  platforms: 4,
  charges: 3,
} as const;

/** hybrid canon §18: the tool belt (H3). Keys 1 to 5 pick a tool; the pick is always on the belt. */
export type ToolId = 'pick' | 'scatter' | 'mortar' | 'drill' | 'lance';
export const TOOLS: readonly { id: ToolId; name: string; sprite: string }[] = [
  { id: 'pick', name: 'Pick', sprite: 'copick-wood' },
  { id: 'scatter', name: 'Scatter pick', sprite: 'scatter-pick' },
  { id: 'mortar', name: 'Mortar', sprite: 'mortar' },
  { id: 'drill', name: 'Drill rig', sprite: 'drill-rig' },
  { id: 'lance', name: 'Cold lance', sprite: 'cold-lance' },
];
/** Scatter: every `cooldownS` it deals `shot` seconds of pick work (× 1 + perLevel × (level − 1)) to each tile in a cone. */
export const SCATTER = {
  cooldownS: 0.42,
  shot: 0.55,
  perLevel: 0.4,
  range: 3.2,
  halfAngle: 0.62,
  kick: 15,
} as const;
/** Mortar: shells a day = perLevel × level; flight speed, gravity, burst radius. */
export const MORTAR = { perLevel: 2, speed: 22, gravity: 26, radius: 2, cooldownS: 0.6 } as const;
/** Drill rig: rigs a day = level; seconds per tile = pick seconds × secsMult / (1 + perLevel × (level − 1)). */
export const DRILL = { secsMult: 1.6, perLevel: 0.35, maxDepth: 60 } as const;
/** Cold lance: digs as the pick, `hot` times faster on hot rock (+ perLevel a level); heat-proof while held. */
export const LANCE = { hot: 3, perLevel: 1 } as const;
/** Vein Break: when the Vein Rush chain reaches `at`, the rest of that vein (up to `max` tiles) shatters into the pack. */
export const VEIN_BREAK = { at: 6, max: 24 } as const;

/** hybrid canon §10: the Foreman's kit at dawn before upgrades. */
export const KIT = {
  pack: 24,
  ladders: 8,
  /** One-way platforms dropped with G; the ladder bundle adds `UPGRADE.platforms` a level. */
  platforms: 6,
  charges: 0,
  blastRadius: 1,
  fuseS: 1.1,
  throwSpeed: 13,
} as const;

/** hybrid canon §11: chests. Scrip = base × (1 + depthTiles / depthDiv); relic chance. */
export const CHEST = { base: 15, depthDiv: 12, relic: 0.3, firstD: 6 } as const;

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
  | 'steady'
  | 'oldHands'
  | 'longLight'
  | 'strike'
  | 'pardon'
  | 'pockets'
  | 'union'
  | 'ledger'
  | 'seniority'
  | 'closedShop'
  | 'picket';
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
  {
    id: 'closedShop',
    name: 'Closed Shop',
    blurb: 'Promotions cost 20% less',
    base: 4,
    growth: 3,
    max: 2,
  },
  {
    id: 'picket',
    name: 'Picket Line',
    blurb: '+1 Echo for every day survived past your best',
    base: 6,
    growth: 2.5,
    max: 3,
  },
  {
    id: 'seniority',
    name: 'Seniority',
    blurb: 'Start each contract at 40% of your best day, with that day’s crew hired',
    base: 15,
    growth: 1,
    max: 1,
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

/** hybrid canon §19 (H4, H5): Foremen. Each is a Holloway person with a body, a starting kit and one rule change.
 * `unlock` reads the village's record: contracts signed, best day, verses found, or a badge earned. */
export type ForemanId =
  'apprentice' | 'smith' | 'lamplighter' | 'fieldhand' | 'woodcutter' | 'doghandler' | 'lone' | 'stoker';
export type Unlock =
  | { kind: 'start' }
  | { kind: 'contracts'; n: number }
  | { kind: 'bestDay'; n: number }
  | { kind: 'verses'; n: number }
  | { kind: 'badge'; id: string };
export interface ForemanDef {
  name: string;
  who: string;
  blurb: string;
  sprite: string;
  unlock: Unlock;
}
export const FOREMEN: Record<ForemanId, ForemanDef> = {
  apprentice: {
    name: 'The Apprentice',
    who: 'New to the pit',
    blurb: 'A wooden pick and nothing else. Balanced.',
    sprite: 'apprentice',
    unlock: { kind: 'start' },
  },
  smith: {
    name: "Smith's Hand",
    who: 'Bram',
    blurb: 'Starts with 4 charges a day. Everything costs 25% less ore.',
    sprite: 'fm-smith',
    unlock: { kind: 'contracts', n: 1 },
  },
  lamplighter: {
    name: 'Lamplighter',
    who: 'Old Wren',
    blurb: 'Lit faces: the crew digs 50% more. Lantern Hours cost no scrip.',
    sprite: 'fm-lamplighter',
    unlock: { kind: 'verses', n: 3 },
  },
  fieldhand: {
    name: 'Fieldhand',
    who: 'Tansy',
    blurb: 'A pack twice the size. Hands cost 30% less to hire.',
    sprite: 'fm-fieldhand',
    unlock: { kind: 'bestDay', n: 8 },
  },
  woodcutter: {
    name: 'Woodcutter',
    who: 'Rook',
    blurb:
      'The axe cleaves: every swing takes the rock above and below too. Twice the ladders and platforms.',
    sprite: 'fm-woodcutter',
    unlock: { kind: 'contracts', n: 3 },
  },
  doghandler: {
    name: 'Dog-handler',
    who: 'Pell',
    blurb: 'Biscuit fetches chests near you and points out the rest. Putters haul 50% faster.',
    sprite: 'fm-doghandler',
    unlock: { kind: 'bestDay', n: 12 },
  },
  lone: {
    name: 'The Lone Foreman',
    who: 'Hard',
    blurb: 'Cannot hire anyone. Every bonus to digging by hand counts five times.',
    sprite: 'lone-foreman',
    unlock: { kind: 'badge', id: 'fm:apprentice' },
  },
  stoker: {
    name: 'The Stoker',
    who: 'Act IV',
    blurb: 'Heat helps instead of hurting. Hot rock pays double.',
    sprite: 'stoker',
    unlock: { kind: 'verses', n: 9 },
  },
};
export const FOREMAN_IDS = Object.keys(FOREMEN) as ForemanId[];
export const FOREMAN_FX = {
  smithCharges: 4,
  smithOre: 0.75,
  lampCrew: 1.5,
  fieldPack: 2,
  fieldHire: 0.7,
  woodProps: 2,
  dogHaul: 1.5,
  /** Biscuit fetches any chest within this many tiles of the Foreman. */
  dogFetch: 5,
  loneHand: 5,
  stokerHot: 2,
} as const;

/** Surviving this day earns a badge: for the Foreman who led the contract, and for the Seam it was signed on. */
export const BADGE_DAY = 15;

/** hybrid canon §13.1: the Union branch's late entries. */
export const UNION = {
  /** Seniority: start a contract at this share of your best day, with this many hands per day skipped. */
  seniorityShare: 0.4,
  seniorityHands: 3,
  /** Closed Shop: promotions cost this much less a level. */
  closedShop: 0.2,
  /** Picket Line: Echoes per day survived past your best, a level. */
  picket: 1,
} as const;

/** hybrid canon §20 (H5): Seams, the shape of the mountain a contract is signed on. Each keeps the biome bands by
 * depth and changes one rule. Surviving `SEAM_UNLOCK_DAY` on a Seam opens the next. */
export type SeamId = 'openCut' | 'drowned' | 'geode' | 'workings' | 'chimney' | 'heart';
export interface SeamDef {
  name: string;
  kind: string;
  blurb: string;
  /** The Seam whose badge opens this one; the Hollow Heart needs all five. */
  after: SeamId | 'all' | null;
}
export const SEAM_DEFS: Record<SeamId, SeamDef> = {
  openCut: {
    name: 'The Open Cut',
    kind: 'Standard',
    blurb: 'The mountain as Holloway knows it.',
    after: null,
  },
  drowned: {
    name: 'The Drowned Street',
    kind: 'Funnel',
    blurb: 'A narrow funnel. Water rises from the bottom through the day.',
    after: 'openCut',
  },
  geode: {
    name: 'The Hanging Geode',
    kind: 'Sky mine',
    blurb: 'The shaft drops into a great bowl. Dig up into crystal hanging overhead.',
    after: 'drowned',
  },
  workings: {
    name: 'The Old Workings',
    kind: 'Sparse',
    blurb: 'Half-dug by past villages. Chests everywhere, thin coal.',
    after: 'geode',
  },
  chimney: {
    name: 'The Ember Chimney',
    kind: 'Shallow',
    blurb: 'Heat from 300 ft down. Short days, and it pays the most.',
    after: 'workings',
  },
  heart: {
    name: 'The Hollow Heart',
    kind: 'Finale',
    blurb: 'The shaft goes straight to the Heart. Verse XII waits there, and the choice.',
    after: 'all',
  },
};
export const SEAM_IDS = Object.keys(SEAM_DEFS) as SeamId[];
export const SEAM_UNLOCK_DAY = 10;

/** hybrid canon §20.1: each Seam's one rule, as numbers. */
export const SEAM_FX = {
  drowned: {
    /** The funnel: open width at the grass and at its foot, and its depth in tiles. */
    topW: 22,
    footW: 4,
    depth: 70,
    /** The water starts at the funnel's foot and rises to `riseTo` tiles below the grass by dusk. */
    riseTo: 10,
    /** Each pumpman slows the rise by this share (at most `pumpMax`). */
    pump: 0.12,
    pumpMax: 0.7,
  },
  geode: { top: 12, bottom: 44, halfW: 24, crystal: 0.5 },
  workings: { tunnels: 14, length: 60, chests: 4, coalShift: 0.07 },
  chimney: { heatD: 30, dayMult: 0.75, scrip: 2, emberChance: 0.12 },
  heart: { shaftDepth: 340 },
} as const;

/** hybrid canon §21: heat. Below `fromD` tiles (the Ember Deep), the meter fills at `rise` a second and drains at
 * `fall`; full, the Foreman is hauled up to the kibble and drops half the pack. */
export const HEAT = { fromD: 250, rise: 0.08, fall: 0.25 } as const;
