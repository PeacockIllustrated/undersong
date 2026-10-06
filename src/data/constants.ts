// World geometry. canon §2 (1 tile = 4 ft), dev-bible §1.4 (32×32 chunks).
export const TILE_PX = 16;
export const CHUNK = 32;
export const WORLD_W = 64;
/** Rows of sky above the nominal grass line. */
export const SKY_ROWS = 14;
export const FT_PER_TILE = 4;
/** Depth (in tiles below the grass line) of the Hollow Heart floor; bedrock below until Endless Depth. */
export const HEART_FLOOR_D = 381;
export const BASE_WORLD_H = 416; // 13 chunks
/** Extra rows added each time Endless Depth needs more world. */
export const ENDLESS_STEP_H = 128;

/** Column of the main shaft. Holloway's buildings sit to its left. */
export const SHAFT_X = 40;

// Simulation timing. dev-bible §1.2
export const TICK_MS = 100;
export const MAX_TICKS_PER_FRAME = 50;
/** A step at least this long (in seconds) is a catch-up step: workers carry leftover work onto the next tile. */
export const COARSE_STEP_S = 0.5;
export const AUTOSAVE_MS = 30_000;

export const SAVE_KEY = 'undersong.save';
export const SETTINGS_KEY = 'undersong.settings';

export const ftFromDepthTiles = (d: number): number => Math.max(0, d) * FT_PER_TILE;

/** Most tiles the foreman will queue from taps and drags. */
export const DIG_QUEUE_MAX = 64;

/** Polish item 6: an unfound verse this close to the Foreman (tiles) gets an edge marker. A hint, not a map. */
export const EDGE_VERSE_RANGE = 24;
