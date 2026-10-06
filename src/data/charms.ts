// Song-loom charms: each known verse can be woven once into a charm, a slotted passive buff. canon §13
import type { Cost } from './items';

export type CharmId =
  'hush' | 'name' | 'lantern' | 'candle' | 'oldPick' | 'window' | 'river' | 'lamp' | 'crystal' | 'hollow';

export interface CharmDef {
  id: CharmId;
  /** The verse it is woven from (0-based). */
  verse: number;
  name: string;
  text: string;
}

export const CHARMS: readonly CharmDef[] = [
  { id: 'hush', verse: 0, name: 'Hush charm', text: 'Hand-mining +20%' },
  { id: 'name', verse: 1, name: 'Name charm', text: 'Miners dig 15% faster' },
  { id: 'lantern', verse: 2, name: 'Lantern charm', text: 'Lanterns burn 25% less Lumen' },
  { id: 'candle', verse: 3, name: 'Candle charm', text: 'The Lamp-works makes 25% more Lumen' },
  { id: 'oldPick', verse: 4, name: 'Old Pick charm', text: 'Every pick hits 20% harder' },
  { id: 'window', verse: 5, name: 'Window charm', text: 'Pumps drain 50% faster' },
  { id: 'river', verse: 6, name: 'River charm', text: 'Haulage carries 50% more' },
  { id: 'lamp', verse: 7, name: 'Lamp charm', text: 'Torches burn 20% brighter' },
  { id: 'crystal', verse: 8, name: 'Crystal charm', text: 'Shard golems wake half as often' },
  { id: 'hollow', verse: 9, name: 'Hollow charm', text: 'Cave-ins give 15% more Echoes' },
];

/** Strength of each charm. */
export const CHARM_FX = {
  hush: 1.2,
  name: 1.15,
  lantern: 0.75,
  candle: 1.25,
  oldPick: 1.2,
  window: 1.5,
  river: 1.5,
  lamp: 1.2,
  crystal: 0.5,
  hollow: 1.15,
} as const;

/**
 * canon §13: slots = 1 + Song-loom levels (max 4), so a woven charm still works the moment a new run starts.
 * Weaving needs a Song-loom; the nth charm costs crystal 8 + 4n and 6 silver bars.
 */
export const CHARM = {
  slotsBase: 1,
  maxSlots: 4,
  cost: (owned: number): Cost[] => [
    { res: 'crystal', n: 8 + 4 * owned },
    { res: 'silverBar', n: 6 },
  ],
};
