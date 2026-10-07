// M10 Finds: the tinker's cart, the curio shelf, Pell's dog, and the sky over Holloway. canon §21, §17.7
import type { ResKey } from './resources';

/** canon §21.1 The tinker's cart parks by the shaft every so often with three offers; you take one. */
export const CART = {
  /** Run time (ms) of the first visit in a run. */
  firstMs: 6 * 60_000,
  /** After you take an offer, the next visit comes this long later (ms), picked evenly between the two. */
  gapMinMs: 6 * 60_000,
  gapMaxMs: 10 * 60_000,
  offers: 3,
  /** Tile column the cart parks at, just east of the headframe. */
  x: 43,
} as const;

export type CartOfferId = 'crate' | 'torches' | 'tonic' | 'grindstone' | 'map' | 'echo';

export interface CartOfferDef {
  id: CartOfferId;
  /** Relative odds of the offer turning up. */
  weight: number;
}

/** canon §21.1 What the tinker may bring. Amounts and lengths are in CART_FX. */
export const CART_OFFERS: readonly CartOfferDef[] = [
  { id: 'crate', weight: 4 },
  { id: 'torches', weight: 2 },
  { id: 'tonic', weight: 3 },
  { id: 'grindstone', weight: 3 },
  { id: 'map', weight: 2 },
  { id: 'echo', weight: 1 },
];

export const CART_FX = {
  /** crate: this many bars of the deepest biome's metal, scaled up by Cave-ins (× (1 + perCaveIn × cave-ins)). */
  crate: { bars: 12, perCaveIn: 0.5 },
  /** torches: this many torches (or lanterns from the Glowroot down, a third as many). */
  torches: 15,
  /** tonic: miners dig this much faster for this long. */
  tonic: { mult: 2, ms: 120_000 },
  /** grindstone: you dig this much faster for this long. */
  grindstone: { mult: 2, ms: 120_000 },
  /** map: the nearest unfound verse glints, wherever the Foreman is, for this long. */
  map: { ms: 180_000 },
  /** echo: this many Echoes. */
  echo: 1,
} as const;

/** The metal a cart crate holds, by the biome of your deepest tile this run. */
export const CRATE_METAL: Record<number, ResKey> = {
  0: 'copperBar',
  1: 'copperBar',
  2: 'ironBar',
  3: 'silverBar',
  4: 'silverBar',
  5: 'goldBar',
  6: 'goldBar',
};

/** canon §21.2 Curios: about one tile in `per` drops one, from the biome it was found in. */
export const CURIO = {
  per: 350,
  /** Relative odds of each rarity among the curios of a biome still unfound. */
  weight: { common: 6, fine: 3, singing: 1 },
  /** Each curio speeds miners or your hands by this much, by rarity. */
  bonus: { common: 0.02, fine: 0.04, singing: 0.08 },
  /** A full set of a biome's four speeds miners and hands both by this much. */
  set: 0.1,
} as const;

export type Rarity = 'common' | 'fine' | 'singing';

export interface CurioDef {
  id: string;
  /** Biome id (1–6) it is found in. */
  biome: number;
  rarity: Rarity;
  fx: 'miners' | 'hands';
}

/** Four per biome: two common, one fine, one singing. Names and lines are in src/story/finds.ts. */
export const CURIOS: readonly CurioDef[] = [
  { id: 'buttonTin', biome: 1, rarity: 'common', fx: 'hands' },
  { id: 'clayPipe', biome: 1, rarity: 'common', fx: 'miners' },
  { id: 'luckPenny', biome: 1, rarity: 'fine', fx: 'hands' },
  { id: 'whistleBone', biome: 1, rarity: 'singing', fx: 'miners' },
  { id: 'glowBead', biome: 2, rarity: 'common', fx: 'miners' },
  { id: 'rootDoll', biome: 2, rarity: 'common', fx: 'hands' },
  { id: 'sporeLocket', biome: 2, rarity: 'fine', fx: 'miners' },
  { id: 'humStone', biome: 2, rarity: 'singing', fx: 'hands' },
  { id: 'doorKey', biome: 3, rarity: 'common', fx: 'hands' },
  { id: 'teaCup', biome: 3, rarity: 'common', fx: 'miners' },
  { id: 'pewterBell', biome: 3, rarity: 'fine', fx: 'hands' },
  { id: 'drownedHarp', biome: 3, rarity: 'singing', fx: 'miners' },
  { id: 'quartzEgg', biome: 4, rarity: 'common', fx: 'miners' },
  { id: 'tuningPeg', biome: 4, rarity: 'common', fx: 'hands' },
  { id: 'prismLens', biome: 4, rarity: 'fine', fx: 'miners' },
  { id: 'echoShell', biome: 4, rarity: 'singing', fx: 'hands' },
  { id: 'cinderRing', biome: 5, rarity: 'common', fx: 'hands' },
  { id: 'slagBird', biome: 5, rarity: 'common', fx: 'miners' },
  { id: 'emberSeal', biome: 5, rarity: 'fine', fx: 'hands' },
  { id: 'firePipe', biome: 5, rarity: 'singing', fx: 'miners' },
  { id: 'heartSplinter', biome: 6, rarity: 'common', fx: 'miners' },
  { id: 'oldName', biome: 6, rarity: 'common', fx: 'hands' },
  { id: 'firstLamp', biome: 6, rarity: 'fine', fx: 'miners' },
  { id: 'songBox', biome: 6, rarity: 'singing', fx: 'hands' },
];

/** canon §14 Pell's dog: fetches the nearest unopened chest within `range` tiles of the Foreman. */
export const DOG = {
  range: 30,
  /** Tiles a second. */
  speed: 8,
  /** Seconds the dog rests by the Foreman between fetches. */
  restS: 3,
} as const;

/** canon §17.7 The sky: an eight-minute day, render only. Phases are fractions of the cycle. */
export const SKY = {
  cycleMs: 8 * 60_000,
  /** Dusk starts, night is full, dawn starts, day is full again. */
  dusk: 0.5,
  night: 0.6,
  dawn: 0.88,
  day: 0.98,
  /** How dark the surface gets at full night (0–1). */
  dark: 0.62,
  fireflies: 14,
  /** Rows of soil below the grass the dark fades out over. */
  fadeRows: 5,
} as const;

/** canon §17.7 Rain now and then: crops grow faster while it lasts. It never starts while you are away. */
export const RAIN = {
  /** Run time (ms) of the first shower, and the gap between showers (ms), picked evenly between the two. */
  firstMs: 4 * 60_000,
  gapMinMs: 5 * 60_000,
  gapMaxMs: 9 * 60_000,
  lastsMs: 60_000,
  grow: 3,
} as const;
