// M10 Finds: curio names and notes, the tinker's offers, and the lines around them. Story text only.
import type { CartOfferId, Rarity } from '../data/finds';

export const CURIO_TEXT: Record<string, { name: string; note: string }> = {
  buttonTin: { name: 'Button tin', note: 'Forty buttons, no two alike. Someone kept every one.' },
  clayPipe: { name: 'Clay pipe', note: 'Bitten through at the stem. A thinking pipe.' },
  luckPenny: { name: 'Lucky penny', note: 'Worn smooth on one side by a thumb.' },
  whistleBone: { name: 'Whistle bone', note: 'Blow it and the shaft answers.' },
  glowBead: { name: 'Glow bead', note: 'A bead of glowroot sap, set hard and still shining.' },
  rootDoll: { name: 'Root doll', note: 'Knotted from roots, with a sprig of moss for hair.' },
  sporeLocket: { name: 'Spore locket', note: 'It opens on a pinch of light.' },
  humStone: { name: 'Hum stone', note: 'Warm, and humming the second verse under its breath.' },
  doorKey: { name: 'Door key', note: 'For one of the drowned houses. Which one, it won’t say.' },
  teaCup: { name: 'Tea cup', note: 'Not a chip on it. Still half full of the Halls.' },
  pewterBell: { name: 'Pewter bell', note: 'A shop bell. It rings when nobody comes in.' },
  drownedHarp: { name: 'Drowned harp', note: 'Three strings left, and they are in tune.' },
  quartzEgg: { name: 'Quartz egg', note: 'Something inside it moves when you sing.' },
  tuningPeg: { name: 'Tuning peg', note: 'From an instrument the size of a house.' },
  prismLens: { name: 'Prism lens', note: 'Hold it to a lamp and the wall fills with colours.' },
  echoShell: { name: 'Echo shell', note: 'Put it to your ear: it plays back the last thing you said.' },
  cinderRing: { name: 'Cinder ring', note: 'Too hot to wear, too pretty to leave.' },
  slagBird: { name: 'Slag bird', note: 'A little bird poured from slag. Someone was bored and kind.' },
  emberSeal: {
    name: 'Ember seal',
    note: 'A wax seal pressed with the village mark, from before the village.',
  },
  firePipe: { name: 'Fire pipe', note: 'A flute that only plays when it’s hot.' },
  heartSplinter: {
    name: 'Heart splinter',
    note: 'A sliver of the Heart. It beats if you hold it long enough.',
  },
  oldName: { name: 'Old name', note: 'A name scratched on a stone. It is the Foreman’s.' },
  firstLamp: { name: 'First lamp', note: 'The first lamp anyone carried down. Still lit.' },
  songBox: { name: 'Song box', note: 'Wind it and it plays all twelve verses, slowly.' },
};

export const RARITY_NAME: Record<Rarity, string> = { common: 'Common', fine: 'Fine', singing: 'Singing' };

export const CURIO_UI = {
  title: 'Curio shelf',
  intro: 'Odd things the mountain gives up. They stay on the shelf through every Cave-in.',
  missing: 'Somewhere in the',
  setDone: 'Full set',
  found: (name: string, rarity: Rarity): [string, string] => [
    `Curio: ${name}`,
    `${RARITY_NAME[rarity]} · on the shelf`,
  ],
  setFound: (biome: string): [string, string] => [
    `The ${biome} set`,
    'A full set on the shelf: everyone works faster',
  ],
  fx: (fx: 'miners' | 'hands', pct: number): string => `${fx === 'miners' ? 'Miners' : 'You'} +${pct}%`,
} as const;

export const CART_TEXT: Record<CartOfferId, { name: string; text: (n: string) => string }> = {
  crate: { name: 'A crate of bars', text: (n) => `${n}` },
  torches: { name: 'Lamps for the dark', text: (n) => `${n}` },
  tonic: { name: 'Miner’s tonic', text: (n) => `Miners dig ×2 for ${n}` },
  grindstone: { name: 'A grindstone', text: (n) => `You dig ×2 for ${n}` },
  map: { name: 'An old map', text: (n) => `The nearest verse glints for ${n}` },
  echo: { name: 'A memory in a jar', text: (n) => `+${n} Echo` },
};

export const CART_UI = {
  here: 'The tinker’s cart',
  hereShort: 'Cart',
  pick: 'Take one. The tinker waits while you’re away.',
  arrived: ['The tinker’s cart is here', 'Three things to choose from, by the shaft'] as [string, string],
  took: (name: string): [string, string] => [name, 'The cart rolls on down the valley'],
  leave: 'Not now',
};

export const RAIN_TEXT: [string, string] = ['Rain over Holloway', 'Crops grow ×3 while it lasts'];
export const DOG_TEXT = {
  fetched: (what: string): [string, string] => ['Pell’s dog found a chest', what],
};
