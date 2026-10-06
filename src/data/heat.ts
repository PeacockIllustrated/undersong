// Act IV: heat in the Ember Deep and the Hollow Heart, cooling vents and cinder wisps. canon §15.
// Every number here is mirrored in canon.

/**
 * canon §15 Heat at a tile: the deep's own warmth plus nearby hot rock, minus vents and water. 0 is cool; 1 stops a miner.
 * `heat = min(ambientMax, ambientPerTile × (d − fromD)) + Σ hotEach × (1 − dist / (hotR + 1)) − cooling`
 */
export const HEAT = {
  /** Heat starts at the top of the Ember Deep (tiles). */
  fromD: 250,
  ambientPerTile: 0.006,
  ambientMax: 0.6,
  /** Ember ore and heartstone within this (square) radius warm a tile. */
  hotR: 3,
  hotEach: 0.12,
  /** A cooling vent takes this much off every tile within its radius (objects.ts). */
  ventCool: 0.9,
  /** A tile beside standing water is cooled this much. */
  waterCool: 0.4,
  /** At this heat work slows; at stopAt miners will not work the face and the Foreman barely can. */
  slowAt: 0.5,
  stopAt: 1,
  slowFactor: 0.6,
  foremanHot: 0.3,
};

/** canon §15 Cinder wisp: chance per second for each miner at a face this hot or hotter. Stalls the miner until tapped. */
export const WISPS = { chancePerSec: 1 / 90, minHeat: 0.5 };

/** canon §15 Endless Depth: rows added below the Heart at a time, and how close to the bottom the village gets first. */
export const ENDLESS = { rows: 64, margin: 24 };

/** canon §15 New Song+: Echoes from a Cave-in are multiplied by 1 + perSong × songs sung. */
export const NEW_SONG = { perSong: 0.5 };
