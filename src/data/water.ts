// Act III: water, pumps, the drowned town and its threats. canon §12. Every number here is mirrored in canon.

/** Water is stored as a level 0–8 per open tile. */
export const WATER = {
  full: 8,
  /** At this level a tile is flooded: nobody can stand in it, and light dims through it (canon §7). */
  deep: 4,
  /** Settling passes per tick; a long offline step gets more so the water still finds its level. */
  passesPerTick: 1,
  maxPassesPerStep: 40,
};

/** canon §12 Pump: drains water units per second from the tiles in its radius, topmost first. */
export const PUMP = { perSec: 12, radius: 6 };

/** canon §12 Cave eel: chance per second for each miner working beside flooded water. Stalls the miner until tapped. */
export const EELS = { chancePerSec: 1 / 60 };

/** canon §12 Shard golem: chance a golem wakes when resonant crystal is mined. Stalls miners nearby until tapped hp times. */
export const GOLEMS = { chance: 0.2, hp: 3, radius: 4 };

/** The drowned town: a house reads as drained once no tile inside it is flooded. */
export const TOWN = { houses: 4 };
