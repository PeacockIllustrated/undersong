// Tile materials. canon §8 (hardness, drops) and §6.1 (ramps from the master palette).
import type { ResKey } from './resources';

export const M = {
  AIR: 0,
  DIRT: 1,
  GRASS: 2,
  STONE: 3,
  COPPER: 4,
  TIN: 5,
  SLATE: 6,
  IRON: 7,
  GLOWCAP: 8,
  SILVER: 9,
  AQUA: 10,
  CRYSTAL: 11,
  EMBER: 12,
  GOLD: 13,
  HEART: 14,
  BEDROCK: 15,
  BRICK: 16,
  CARVING: 17,
  BASALT: 18,
  RUBBLE: 19,
  HEARTWALL: 20,
} as const;
export type M = (typeof M)[keyof typeof M];

export interface MaterialDef {
  id: M;
  name: string;
  /** H_material in canon §4.2. 0 = cannot be mined. */
  hardness: number;
  /** [base, light, dark] from the master palette. */
  ramp: readonly [string, string, string];
  drop?: { res: ResKey; n: number };
  /** Ore overlay sprite drawn on top of the host rock texture. */
  overlay?: string;
  /** Host rock texture for ore tiles. */
  host?: M;
  emit?: { channel: 'warm' | 'cool'; strength: number };
  /** Heat emitted when exposed (Ember Deep). canon §12 */
  heat?: number;
  isOre?: boolean;
}

const EARTH = ['#8A5A3B', '#A46D48', '#6B4329'] as const;
const STONE_R = ['#6D7480', '#878E9A', '#555B66'] as const;
const SLATE_R = ['#4B4F6B', '#5F6487', '#373A52'] as const;
const BASALT_R = ['#373A52', '#4B4F6B', '#262940'] as const;
const HEART_R = ['#262940', '#373A52', '#141A33'] as const;

export const MATERIALS: Record<number, MaterialDef> = {
  [M.AIR]: { id: M.AIR, name: 'Air', hardness: 0, ramp: ['#000000', '#000000', '#000000'] },
  [M.DIRT]: { id: M.DIRT, name: 'Dirt', hardness: 1, ramp: EARTH },
  [M.GRASS]: { id: M.GRASS, name: 'Grass', hardness: 1, ramp: EARTH },
  [M.STONE]: { id: M.STONE, name: 'Stone', hardness: 4, ramp: STONE_R, drop: { res: 'rubble', n: 1 } },
  [M.COPPER]: {
    id: M.COPPER,
    name: 'Copper ore',
    hardness: 4,
    ramp: STONE_R,
    host: M.STONE,
    overlay: 'ore-copper',
    drop: { res: 'copperOre', n: 2 },
    isOre: true,
  },
  [M.TIN]: {
    id: M.TIN,
    name: 'Tin ore',
    hardness: 4,
    ramp: STONE_R,
    host: M.STONE,
    overlay: 'ore-tin',
    drop: { res: 'tinOre', n: 2 },
    isOre: true,
  },
  [M.SLATE]: { id: M.SLATE, name: 'Slate', hardness: 6, ramp: SLATE_R, drop: { res: 'rubble', n: 1 } },
  [M.IRON]: {
    id: M.IRON,
    name: 'Iron ore',
    hardness: 8,
    ramp: SLATE_R,
    host: M.SLATE,
    overlay: 'ore-iron',
    drop: { res: 'ironOre', n: 2 },
    isOre: true,
  },
  [M.GLOWCAP]: {
    id: M.GLOWCAP,
    name: 'Glowcap cluster',
    hardness: 2,
    ramp: SLATE_R,
    host: M.SLATE,
    overlay: 'ore-glowcap',
    drop: { res: 'spores', n: 2 },
    emit: { channel: 'cool', strength: 0.85 },
    isOre: true,
  },
  [M.SILVER]: {
    id: M.SILVER,
    name: 'Silver ore',
    hardness: 14,
    ramp: SLATE_R,
    host: M.SLATE,
    overlay: 'ore-silver',
    drop: { res: 'silverOre', n: 1 },
    isOre: true,
  },
  [M.AQUA]: {
    id: M.AQUA,
    name: 'Aquamarine',
    hardness: 18,
    ramp: SLATE_R,
    host: M.SLATE,
    overlay: 'ore-aqua',
    drop: { res: 'aquamarine', n: 1 },
    isOre: true,
  },
  [M.CRYSTAL]: {
    id: M.CRYSTAL,
    name: 'Resonant crystal',
    hardness: 24,
    ramp: ['#2A5E86', '#7FD6FF', '#262940'],
    overlay: 'ore-crystal',
    drop: { res: 'crystal', n: 1 },
    emit: { channel: 'cool', strength: 0.9 },
    isOre: true,
  },
  [M.EMBER]: {
    id: M.EMBER,
    name: 'Ember ore',
    hardness: 32,
    ramp: BASALT_R,
    host: M.BASALT,
    overlay: 'ore-ember',
    drop: { res: 'emberOre', n: 1 },
    emit: { channel: 'warm', strength: 0.6 },
    heat: 1,
    isOre: true,
  },
  [M.GOLD]: {
    id: M.GOLD,
    name: 'Gold ore',
    hardness: 28,
    ramp: BASALT_R,
    host: M.BASALT,
    overlay: 'ore-gold',
    drop: { res: 'goldOre', n: 1 },
    isOre: true,
  },
  [M.HEART]: {
    id: M.HEART,
    name: 'Heartstone',
    hardness: 60,
    ramp: HEART_R,
    host: M.HEARTWALL,
    overlay: 'ore-heart',
    drop: { res: 'heartstone', n: 1 },
    emit: { channel: 'warm', strength: 0.7 },
    isOre: true,
  },
  [M.BEDROCK]: { id: M.BEDROCK, name: 'Bedrock', hardness: 0, ramp: ['#141A33', '#262940', '#141A33'] },
  [M.BRICK]: { id: M.BRICK, name: 'Old brick', hardness: 10, ramp: SLATE_R, drop: { res: 'brick', n: 1 } },
  [M.CARVING]: { id: M.CARVING, name: 'Verse carving', hardness: 0, ramp: STONE_R },
  [M.BASALT]: { id: M.BASALT, name: 'Basalt', hardness: 20, ramp: BASALT_R, drop: { res: 'rubble', n: 1 } },
  [M.RUBBLE]: { id: M.RUBBLE, name: 'Rubble', hardness: 2, ramp: STONE_R, drop: { res: 'rubble', n: 1 } },
  [M.HEARTWALL]: {
    id: M.HEARTWALL,
    name: 'Heartrock',
    hardness: 26,
    ramp: HEART_R,
    drop: { res: 'rubble', n: 1 },
  },
};

export const isSolid = (m: number): boolean => m !== M.AIR;
export const isMineable = (m: number): boolean => (MATERIALS[m]?.hardness ?? 0) > 0;

/**
 * canon §8.1 pick gates: the lowest pick tier (index into PICKS) that can break a material at all.
 * Anything not listed can be dug with the wooden pick. ADR-017.
 */
export const MIN_PICK: Partial<Record<number, number>> = {
  [M.SLATE]: 1,
  [M.IRON]: 2,
  [M.SILVER]: 3,
  [M.BRICK]: 3,
  [M.AQUA]: 4,
  [M.CRYSTAL]: 5,
  [M.BASALT]: 6,
  [M.EMBER]: 6,
  [M.GOLD]: 6,
  [M.HEART]: 7,
  [M.HEARTWALL]: 7,
};

/** Mineable, and the village's pick is good enough for it. */
export const canDig = (m: number, pickTier: number): boolean =>
  isMineable(m) && pickTier >= (MIN_PICK[m] ?? 0);
