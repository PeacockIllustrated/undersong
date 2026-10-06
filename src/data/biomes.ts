// Biome bands. canon §2 (depths in ft; 1 tile = 4 ft).
import type { ResKey } from './resources';
export interface BiomeDef {
  id: number;
  name: string;
  act: 'I' | 'II' | 'III' | 'IV';
  /** First depth tile (inclusive). */
  d0: number;
  /** Last depth tile (exclusive). */
  d1: number;
}

export const BIOMES: readonly BiomeDef[] = [
  { id: 0, name: 'Holloway', act: 'I', d0: -99, d1: 0 },
  { id: 1, name: 'Topsoil & Stone', act: 'I', d0: 0, d1: 38 },
  { id: 2, name: 'Glowroot Caverns', act: 'II', d0: 38, d1: 100 },
  { id: 3, name: 'The Flooded Halls', act: 'III', d0: 100, d1: 175 },
  { id: 4, name: 'Singing Geodes', act: 'III', d0: 175, d1: 250 },
  { id: 5, name: 'Ember Deep', act: 'IV', d0: 250, d1: 350 },
  { id: 6, name: 'The Hollow Heart', act: 'IV', d0: 350, d1: 99999 },
];

/** The resources each biome is about: the HUD shows these first (polish item 8). Holloway shares Topsoil's. */
export const BIOME_RES: Record<number, readonly ResKey[]> = {
  0: ['copperBar', 'tinBar'],
  1: ['copperBar', 'tinBar'],
  2: ['ironBar', 'lumen'],
  3: ['silverBar', 'aquamarine'],
  4: ['crystal', 'silverBar'],
  5: ['goldBar', 'emberOre'],
  6: ['heartstone', 'goldBar'],
};

export function biomeAt(d: number): BiomeDef {
  for (let i = BIOMES.length - 1; i >= 0; i--) {
    const b = BIOMES[i]!;
    if (d >= b.d0) return b;
  }
  return BIOMES[0]!;
}

/** Endless Depth (post-ending) cycles these biome looks below the Heart. */
export const ENDLESS_CYCLE = [2, 3, 4, 5] as const;
