// canon §7 Lighting constants.
export const LIGHT = {
  decayAir: 0.085,
  decaySolid: 0.26,
  /** Flooded tiles (water level ≥ 4) dim light faster. */
  decayWater: 0.12,
  sky: 1.0,
  torch: 1.0,
  /** Torches gutter in the damp below 150 ft. */
  torchDeep: 0.6,
  torchDeepFromD: 38,
  /** Lanterns burn brighter and reach further, at a Lumen upkeep. */
  lantern: 1.5,
  /** Range bound used by incremental relighting: max strength / min decay. */
  margin: 19,
  /** Render-only flicker amplitude for warm light. Never affects the sim. */
  flicker: 0.06,
  darkness: 0.94,
  coolTint: 0.16,
  warmTint: 0.07,
} as const;

/** canon §4.5 Light factor for miner and foreman speed. */
export function lightFactor(l: number): number {
  if (l >= 0.6) return 1.0;
  if (l >= 0.3) return 0.7;
  return 0.4;
}
