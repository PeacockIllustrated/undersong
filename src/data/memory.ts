// M9: what the village carries from one run to the next, and the Foreman's lead. canon §20.

/** canon §20 M9-03: with Bunkhouse Roll, one miner rehires himself at most this often, while bars allow. */
export const REHIRE_EVERY_MS = 1500;

/** canon §20 M9-05: the run's deepest depth is kept for each minute, for at most this many minutes. */
export const GHOST = { capMin: 480 } as const;

/** canon §20 M9-06: miners within this many tiles of the Foreman (either way) dig this much faster. */
export const LEAD = { radius: 6, mult: 1.25 } as const;
